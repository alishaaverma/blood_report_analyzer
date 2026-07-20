from django import forms

from .models import Report


class ReportUploadForm(forms.ModelForm):
    class Meta:
        model = Report
        fields = ["title", "pdf_file"]
        widgets = {
            "title": forms.TextInput(attrs={"placeholder": "e.g. Full Body Checkup - July 2026"}),
        }

    def clean_pdf_file(self):
        f = self.cleaned_data["pdf_file"]
        if not f.name.lower().endswith(".pdf"):
            raise forms.ValidationError("Please upload a PDF file.")
        max_mb = 10
        if f.size > max_mb * 1024 * 1024:
            raise forms.ValidationError(f"File too large (max {max_mb}MB).")
        return f
