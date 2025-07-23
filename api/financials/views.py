from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .scrapers import scrape_company

class FinancialDataView(APIView):
    def get(self, request, ticker):
        if not ticker:
            return Response({"error": "Ticker is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        result = scrape_company(ticker.upper())
        if result:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Could not retrieve data for the given ticker"}, status=status.HTTP_404_NOT_FOUND)