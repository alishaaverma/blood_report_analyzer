from django.urls import path

from . import views
from . import api_views

app_name = "accounts"

urlpatterns = [
    path(
        "api/password/forgot/send-otp/",
        api_views.forgot_password_send_otp_api,
        name="api_forgot_send_otp",
    ),
    path(
        "api/password/change/send-otp/",
        api_views.change_password_send_otp_api,
        name="api_change_send_otp",
    ),
    path(
        "api/password/verify-otp/",
        api_views.verify_password_otp_api,
        name="api_verify_password_otp",
    ),
    path(
        "api/password/resend-otp/",
        api_views.resend_password_otp_api,
        name="api_resend_password_otp",
    ),
    path(
        "api/password/set/",
        api_views.set_new_password_api,
        name="api_set_new_password",
    ),
    path("signup/", views.SignUpView.as_view(), name="signup"),
    path("login/", views.UserLoginView.as_view(), name="login"),
    path("logout/", views.UserLogoutView.as_view(), name="logout"),
    path("profile/", views.profile_view, name="profile"),
    path("update-location/", views.update_location, name="update_location"),
    path(
        "password/forgot/",
        views.forgot_password_request,
        name="forgot_password",
    ),
    path(
        "password/change/",
        views.change_password_request,
        name="change_password",
    ),
    path(
        "password/otp/<str:purpose>/",
        views.password_otp_verify,
        name="password_otp_verify",
    ),
    path(
        "password/otp/<str:purpose>/resend/",
        views.resend_password_otp,
        name="resend_password_otp",
    ),
    path(
        "password/set/<str:purpose>/",
        views.set_new_password,
        name="set_new_password",
    ),
]
