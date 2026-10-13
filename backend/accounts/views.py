import secrets
import string

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .sms import send_sms

from .models import PasswordResetOTP
from .permissions import IsAdmin
from .serializers import (
    AvatarUploadSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    ResetPasswordSerializer,
    SignupSerializer,
    StaffCreateSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)

User = get_user_model()


def generate_temp_password(length=12):
    """Génère un mot de passe temporaire aléatoire pour les comptes créés par l'admin."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_matricule(role):
    """Génère un matricule séquentiel : T0001, T0002... ou R0001, R0002..."""
    prefix = 'T' if role == 'TECHNICIEN' else 'R'
    last_user = (
        User.objects.filter(matricule__startswith=prefix)
        .order_by('-matricule')
        .first()
    )
    if last_user and last_user.matricule:
        last_number = int(last_user.matricule[1:])
        new_number = last_number + 1
    else:
        new_number = 1
    return f"{prefix}{new_number:04d}"


class SignupView(generics.CreateAPIView):
    """POST /api/auth/signup/ — inscription client, publique. Rôle CLIENT forcé."""
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # ignore tout token présent (évite un 401 si un vieux token traîne)


class LoginView(APIView):
    """POST /api/auth/login/ — body: { identifiant, password }."""
    permission_classes = [AllowAny]
    authentication_classes = []  # idem : le login ne doit jamais dépendre d'un token existant

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.user

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email
        refresh['full_name'] = user.full_name

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user, context={'request': request}).data,
        }, status=status.HTTP_200_OK)


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/me/       -> lire son propre profil
    PATCH/PUT /api/auth/me/  -> modifier ses infos (prénom, nom, téléphone)
    """
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UpdateProfileSerializer
        return UserSerializer

    def get_serializer_context(self):
        return {'request': self.request}


class AvatarUploadView(APIView):
    """POST /api/auth/avatar/ — multipart/form-data, champ 'avatar'."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = AvatarUploadSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            UserSerializer(request.user, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ — nécessite l'ancien mot de passe."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Mot de passe modifié avec succès."},
            status=status.HTTP_200_OK,
        )


class UserListView(generics.ListAPIView):
    """GET /api/auth/users/ — liste tous les comptes, réservé à l'admin (dashboard)."""
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.all().order_by('-created_at')

    def get_serializer_context(self):
        return {'request': self.request}


class UserActivationView(APIView):
    """PATCH /api/auth/users/<id>/ — { "is_active": bool } : l'admin active ou désactive un compte."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        if target.pk == request.user.pk:
            return Response(
                {"detail": "Vous ne pouvez pas désactiver votre propre compte."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_active = request.data.get('is_active')
        if not isinstance(is_active, bool):
            return Response({"is_active": ["Valeur booléenne attendue."]}, status=status.HTTP_400_BAD_REQUEST)

        target.is_active = is_active
        target.save(update_fields=['is_active', 'updated_at'])
        return Response(UserSerializer(target, context={'request': request}).data)


def generate_otp():
    """Code à 6 chiffres, généré de façon cryptographiquement sûre."""
    return f"{secrets.randbelow(1_000_000):06d}"


class ForgotPasswordView(APIView):
    """POST /api/auth/forgot-password/ — body: { email }. Envoie un code OTP par email."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        user = User.objects.get(email__iexact=email)
        code = generate_otp()
        PasswordResetOTP.objects.create(user=user, code=code)

        send_mail(
            subject="InTech Interventions — Code de réinitialisation",
            message=(
                f"Bonjour {user.first_name},\n\n"
                f"Votre code de réinitialisation est : {code}\n"
                f"Ce code expire dans 10 minutes.\n\n"
                f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
            ),
            from_email=None,
            recipient_list=[user.email],
        )

        return Response(
            {"detail": "Un code de vérification a été envoyé à votre email."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/ — body: { email, code, new_password, new_password2 }."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Mot de passe réinitialisé avec succès."},
            status=status.HTTP_200_OK,
        )


class StaffCreateView(generics.CreateAPIView):
    """
    POST /api/auth/staff/ — réservé aux admins.
    Body attend : email, first_name, last_name, phone, role (TECHNICIEN ou RESPONSABLE).
    Génère un matricule (T0001/R0001...) et un mot de passe temporaire, envoyés par email.
    """
    queryset = User.objects.all()
    serializer_class = StaffCreateSerializer
    permission_classes = [IsAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role = serializer.validated_data['role']
        matricule = generate_matricule(role)
        temp_password = generate_temp_password()

        user = serializer.save(
            matricule=matricule,
            must_change_password=True,
        )
        user.set_password(temp_password)
        user.save()

        role_label = "Technicien" if role == 'TECHNICIEN' else "Responsable"
        login_url = f"{settings.FRONTEND_URL}/staff-login"
        send_mail(
            subject=f"InTech Interventions — Votre compte {role_label}",
            message=(
                f"Bonjour {user.first_name},\n\n"
                f"Bienvenue sur InTech Interventions.\n"
                f"Un compte {role_label} a été créé pour vous.\n"
                f"Identifiant de connexion (matricule) : {matricule}\n"
                f"Mot de passe temporaire : {temp_password}\n\n"
                f"Connectez-vous ici : {login_url}\n\n"
                f"Merci de vous connecter et de changer votre mot de passe "
                f"dès votre première connexion."
            ),
            from_email=None,
            recipient_list=[user.email],
        )

        return Response(
            UserSerializer(user, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

class TechnicianListView(generics.ListAPIView):
    """GET /api/auth/technicians/ — liste des techniciens, accessible Admin + Responsable."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role not in ('ADMIN', 'RESPONSABLE'):
            return User.objects.none()
        return User.objects.filter(role='TECHNICIEN').order_by('matricule')

    def get_serializer_context(self):
        return {'request': self.request}