
from django.urls import path
from .views import AnalyzeSentimentAPIView

urlpatterns = [
    path('analyze-sentiment/', AnalyzeSentimentAPIView.as_view(), name='analyze_sentiment'),
]
