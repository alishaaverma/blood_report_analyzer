from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.forms import SetPasswordForm
from django.contrib.auth.models import User

from .models import UserProfile


class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True)
    phone_number = forms.CharField(required=False, max_length=15)
    age = forms.IntegerField(required=False, min_value=1, max_value=120)
    gender = forms.ChoiceField(
        choices=[("", "Select"), ("M", "Male"), ("F", "Female"), ("O", "Other")],
        required=False,
    )

    class Meta:
        model = User
        fields = ["username", "email", "password1", "password2"]

    def save(self, commit=True):
        user = super().save(commit=commit)
        if commit:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.phone_number = self.cleaned_data.get("phone_number", "")
            profile.age = self.cleaned_data.get("age")
            profile.gender = self.cleaned_data.get("gender", "")
            profile.save()
        return user


class ProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ["phone_number", "age", "gender"]


class LocationUpdateForm(forms.ModelForm):
    """Used by an AJAX call from the browser's geolocation API."""

    class Meta:
        model = UserProfile
        fields = ["last_latitude", "last_longitude"]


class EmailOTPRequestForm(forms.Form):
    email = forms.EmailField(
        label="Account email",
        widget=forms.EmailInput(attrs={"autocomplete": "email"}),
    )


class OTPVerificationForm(forms.Form):
    code = forms.RegexField(
        regex=r"^\d{6}$",
        max_length=6,
        label="6-digit OTP",
        error_messages={"invalid": "Enter the 6-digit code from your email."},
        widget=forms.TextInput(
            attrs={
                "autocomplete": "one-time-code",
                "inputmode": "numeric",
                "placeholder": "000000",
            }
        ),
    )


class OTPSetPasswordForm(SetPasswordForm):
    pass
