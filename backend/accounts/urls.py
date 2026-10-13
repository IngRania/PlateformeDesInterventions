from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    SignupView,
    LoginView,
    MeView,
    AvatarUploadView,
    ChangePasswordView,
    ForgotPasswordView,
    ResetPasswordView,
    StaffCreateView,
    UserListView, TechnicianListView, UserActivationView,
)

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='login-refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('avatar/', AvatarUploadView.as_view(), name='avatar-upload'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('staff/', StaffCreateView.as_view(), name='staff-create'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserActivationView.as_view(), name='user-activation'),
    path('technicians/', TechnicianListView.as_view(), name='technician-list'),
]