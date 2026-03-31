from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (TaxRateViewSet, AccountViewSet, ContactViewSet, ItemViewSet,
                    InvoiceViewSet, BillViewSet, PaymentViewSet, ExpenseViewSet,
                    JournalEntryViewSet, DashboardView, ReportsView)

router = DefaultRouter()
router.register('tax-rates', TaxRateViewSet, basename='tax-rates')
router.register('accounts', AccountViewSet, basename='accounts')
router.register('contacts', ContactViewSet, basename='contacts')
router.register('items', ItemViewSet, basename='items')
router.register('invoices', InvoiceViewSet, basename='invoices')
router.register('bills', BillViewSet, basename='bills')
router.register('payments', PaymentViewSet, basename='payments')
router.register('expenses', ExpenseViewSet, basename='expenses')
router.register('journal-entries', JournalEntryViewSet, basename='journal-entries')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view()),
    path('reports/', ReportsView.as_view()),
]
