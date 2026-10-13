from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import PasswordResetOTP, Role

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'role', 'matricule', 'avatar_url', 'is_active',
            'must_change_password', 'created_at',
        ]
        read_only_fields = ['id', 'role', 'matricule', 'created_at']

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class SignupSerializer(serializers.ModelSerializer):
    """Inscription publique — toujours en rôle CLIENT, se connecte par email."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data, role=Role.CLIENT)
        user.set_password(password)
        user.save()
        return user


class StaffCreateSerializer(serializers.ModelSerializer):
    """Création d'un Technicien ou Responsable par l'admin. Matricule généré côté vue."""
    role = serializers.ChoiceField(choices=[Role.TECHNICIEN, Role.RESPONSABLE])

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'role']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value


class LoginSerializer(serializers.Serializer):
    """
    Connexion unifiée :
    - Client / Admin -> se connectent avec leur EMAIL
    - Technicien / Responsable -> se connectent avec leur MATRICULE (T0001 / R0001)
    Le champ 'identifiant' accepte les deux, résolu automatiquement.
    """
    identifiant = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifiant = attrs.get('identifiant', '').strip()
        password = attrs.get('password')

        user_obj = (
                User.objects.filter(email__iexact=identifiant).first()
                or User.objects.filter(matricule__iexact=identifiant).first()
        )

        if user_obj is None:
            raise serializers.ValidationError("Identifiant ou mot de passe incorrect.")

        # authenticate() utilise USERNAME_FIELD ('email') en interne, quelle que soit
        # la valeur saisie par l'utilisateur (email ou matricule) : on lui passe
        # toujours l'email réel de l'utilisateur trouvé.
        user = authenticate(
            request=self.context.get('request'),
            username=user_obj.email,
            password=password,
        )

        if user is None or not user.is_active:
            raise serializers.ValidationError("Identifiant ou mot de passe incorrect.")

        self.user = user
        return attrs


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Modifier ses propres infos après inscription — jamais le rôle, l'email ni le matricule."""
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone']


class AvatarUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['avatar']


class ForgotPasswordSerializer(serializers.Serializer):
    """Étape 1 : l'email (déjà utilisé à l'inscription) -> génère et envoie un code OTP."""
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Aucun compte associé à cet email.")
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Étape 2 : email + code reçu + nouveau mot de passe."""
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password2": "Les mots de passe ne correspondent pas."})

        user = User.objects.filter(email__iexact=attrs['email']).first()
        if user is None:
            raise serializers.ValidationError({"email": "Aucun compte associé à cet email."})

        otp = (
            PasswordResetOTP.objects.filter(user=user, code=attrs['code'])
            .order_by('-created_at')
            .first()
        )
        if otp is None or not otp.is_valid():
            raise serializers.ValidationError({"code": "Code invalide ou expiré."})

        self.user = user
        self.otp = otp
        return attrs

    def save(self, **kwargs):
        self.user.set_password(self.validated_data['new_password'])
        self.user.save()
        self.otp.is_used = True
        self.otp.save()
        return self.user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Ancien mot de passe incorrect.")
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password2": "Les mots de passe ne correspondent pas."})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.must_change_password = False
        user.save()
        return user