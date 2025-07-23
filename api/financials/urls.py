
from django.urls import path
from .views import FinancialDataView

urlpatterns = [
    path('financial_data/<str:ticker>/', FinancialDataView.as_view(), name='financial_data'),
]
