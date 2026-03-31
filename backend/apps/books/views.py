from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from .models import TaxRate, Account, Contact, Item, Invoice, Bill, Payment, Expense, JournalEntry
from .serializers import (
    TaxRateSerializer, AccountSerializer, ContactSerializer, ContactListSerializer,
    ItemSerializer, InvoiceSerializer, InvoiceListSerializer, InvoiceCreateSerializer,
    BillSerializer, BillListSerializer, PaymentSerializer, ExpenseSerializer, JournalEntrySerializer
)


class TaxRateViewSet(viewsets.ModelViewSet):
    queryset = TaxRate.objects.filter(is_active=True)
    serializer_class = TaxRateSerializer
    permission_classes = [IsAuthenticated]


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.filter(is_active=True).order_by('account_type', 'name')
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'code']
    filterset_fields = ['account_type']


class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ['display_name', 'company_name', 'email', 'gstin', 'phone']
    filterset_fields = ['contact_type', 'is_active']
    ordering_fields = ['display_name', 'created_at']
    ordering = ['display_name']

    def get_queryset(self):
        return Contact.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return ContactListSerializer
        return ContactSerializer

    @action(detail=True, methods=['get'])
    def statement(self, request, pk=None):
        contact = self.get_object()
        invoices = contact.invoices.all().order_by('-invoice_date')
        payments = contact.payments.all().order_by('-payment_date')
        return Response({
            'contact': ContactSerializer(contact).data,
            'invoices': InvoiceListSerializer(invoices, many=True).data,
            'payments': PaymentSerializer(payments, many=True).data,
        })


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.filter(is_active=True)
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'sku', 'hsn_sac']
    filterset_fields = ['item_type']


class InvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ['invoice_number', 'customer__display_name', 'reference']
    filterset_fields = ['status']
    ordering_fields = ['invoice_date', 'due_date', 'total_amount']
    ordering = ['-invoice_date']

    def get_queryset(self):
        return Invoice.objects.select_related('customer').prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def perform_create(self, serializer):
        # Auto-generate invoice number
        last = Invoice.objects.order_by('-id').first()
        num = (last.id + 1) if last else 1
        serializer.save(invoice_number=f'INV-{num:05d}')

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'sent'
        invoice.save()
        return Response({'status': 'sent'})

    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'void'
        invoice.save()
        return Response({'status': 'voided'})

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        invoice = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        if amount <= 0 or amount > invoice.balance_due:
            return Response({'error': 'Invalid payment amount'}, status=400)
        invoice.amount_paid += amount
        invoice.balance_due -= amount
        invoice.status = 'paid' if invoice.balance_due == 0 else 'partial'
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)


class BillViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ['bill_number', 'vendor__display_name', 'vendor_bill_number']
    filterset_fields = ['status']
    ordering = ['-bill_date']

    def get_queryset(self):
        return Bill.objects.select_related('vendor').prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'list':
            return BillListSerializer
        return BillSerializer

    def perform_create(self, serializer):
        last = Bill.objects.order_by('-id').first()
        num = (last.id + 1) if last else 1
        serializer.save(bill_number=f'BILL-{num:05d}')


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('contact').order_by('-payment_date')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['payment_number', 'contact__display_name', 'reference']
    filterset_fields = ['payment_type', 'payment_mode']

    def perform_create(self, serializer):
        last = Payment.objects.order_by('-id').first()
        num = (last.id + 1) if last else 1
        ptype = serializer.validated_data.get('payment_type', 'received')
        prefix = 'PMT' if ptype == 'received' else 'PAY'
        serializer.save(payment_number=f'{prefix}-{num:05d}')


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('account', 'vendor').order_by('-expense_date')
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['description', 'reference', 'vendor__display_name']
    filterset_fields = ['is_billable']


class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.prefetch_related('lines').order_by('-entry_date')
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        last = JournalEntry.objects.order_by('-id').first()
        num = (last.id + 1) if last else 1
        serializer.save(entry_number=f'JE-{num:05d}')


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        month_start = today.replace(day=1)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)

        # Revenue this month
        revenue = Invoice.objects.filter(
            invoice_date__gte=month_start, status__in=['sent', 'partial', 'paid']
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        # Expenses this month
        expenses = Expense.objects.filter(
            expense_date__gte=month_start
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        # Outstanding receivables
        receivables = Invoice.objects.filter(
            status__in=['sent', 'partial', 'overdue']
        ).aggregate(total=Sum('balance_due'))['total'] or 0

        # Outstanding payables
        payables = Bill.objects.filter(
            status__in=['open', 'partial', 'overdue']
        ).aggregate(total=Sum('balance_due'))['total'] or 0

        # Overdue invoices
        overdue_count = Invoice.objects.filter(
            due_date__lt=today, status__in=['sent', 'partial']
        ).count()

        # Recent invoices
        recent_invoices = Invoice.objects.select_related('customer').order_by('-created_at')[:5]

        # Monthly revenue chart (last 6 months)
        monthly_data = []
        for i in range(5, -1, -1):
            m_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            m_end = (m_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            m_rev = Invoice.objects.filter(
                invoice_date__range=[m_start, m_end], status__in=['sent', 'partial', 'paid']
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            m_exp = Expense.objects.filter(
                expense_date__range=[m_start, m_end]
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            monthly_data.append({
                'month': m_start.strftime('%b %Y'),
                'revenue': float(m_rev),
                'expenses': float(m_exp),
                'profit': float(m_rev - m_exp),
            })

        # Invoice status breakdown
        status_data = Invoice.objects.values('status').annotate(
            count=Count('id'), total=Sum('total_amount')
        )

        # Top customers
        top_customers = Contact.objects.filter(
            contact_type__in=['customer', 'both']
        ).annotate(
            total_invoiced=Sum('invoices__total_amount', filter=Q(invoices__status__in=['sent', 'partial', 'paid']))
        ).filter(total_invoiced__gt=0).order_by('-total_invoiced')[:5]

        return Response({
            'summary': {
                'revenue_this_month': float(revenue),
                'expenses_this_month': float(expenses),
                'profit_this_month': float(revenue - expenses),
                'outstanding_receivables': float(receivables),
                'outstanding_payables': float(payables),
                'overdue_invoices': overdue_count,
            },
            'monthly_chart': monthly_data,
            'invoice_status': list(status_data),
            'recent_invoices': InvoiceListSerializer(recent_invoices, many=True).data,
            'top_customers': [
                {'name': c.display_name, 'total': float(c.total_invoiced or 0)}
                for c in top_customers
            ],
        })


class ReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get('type', 'profit_loss')
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')

        today = date.today()
        if not from_date:
            from_date = today.replace(month=4, day=1) if today.month >= 4 else today.replace(year=today.year - 1, month=4, day=1)
        if not to_date:
            to_date = today

        if report_type == 'profit_loss':
            revenue = Invoice.objects.filter(
                invoice_date__range=[from_date, to_date],
                status__in=['sent', 'partial', 'paid']
            ).aggregate(total=Sum('total_amount'))['total'] or 0

            expenses = Expense.objects.filter(
                expense_date__range=[from_date, to_date]
            ).aggregate(total=Sum('total_amount'))['total'] or 0

            # Group expenses by account
            expense_by_account = Expense.objects.filter(
                expense_date__range=[from_date, to_date]
            ).values('account__name').annotate(total=Sum('total_amount')).order_by('-total')

            return Response({
                'report_type': 'Profit & Loss',
                'from_date': str(from_date),
                'to_date': str(to_date),
                'revenue': float(revenue),
                'total_expenses': float(expenses),
                'net_profit': float(revenue - expenses),
                'expense_breakdown': list(expense_by_account),
            })

        elif report_type == 'receivables':
            invoices = Invoice.objects.filter(
                status__in=['sent', 'partial', 'overdue']
            ).select_related('customer').order_by('due_date')

            data = []
            for inv in invoices:
                days_overdue = max(0, (today - inv.due_date).days)
                data.append({
                    'invoice_number': inv.invoice_number,
                    'customer': inv.customer.display_name,
                    'invoice_date': str(inv.invoice_date),
                    'due_date': str(inv.due_date),
                    'total': float(inv.total_amount),
                    'balance_due': float(inv.balance_due),
                    'days_overdue': days_overdue,
                    'bucket': '0-30' if days_overdue <= 30 else '31-60' if days_overdue <= 60 else '61-90' if days_overdue <= 90 else '90+',
                })

            total = sum(d['balance_due'] for d in data)
            return Response({'report_type': 'Receivables Aging', 'total': total, 'data': data})

        elif report_type == 'gst':
            invoices = Invoice.objects.filter(
                invoice_date__range=[from_date, to_date],
                status__in=['sent', 'partial', 'paid']
            )
            total_taxable = invoices.aggregate(total=Sum('taxable_amount'))['total'] or 0
            total_cgst = invoices.aggregate(total=Sum('cgst_amount'))['total'] or 0
            total_sgst = invoices.aggregate(total=Sum('sgst_amount'))['total'] or 0
            total_igst = invoices.aggregate(total=Sum('igst_amount'))['total'] or 0

            return Response({
                'report_type': 'GST Summary',
                'from_date': str(from_date),
                'to_date': str(to_date),
                'taxable_amount': float(total_taxable),
                'cgst': float(total_cgst),
                'sgst': float(total_sgst),
                'igst': float(total_igst),
                'total_tax': float(total_cgst + total_sgst + total_igst),
            })

        return Response({'error': 'Unknown report type'}, status=400)
