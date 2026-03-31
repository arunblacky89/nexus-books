import uuid
from django.db import models
from django.db.models import Sum


class TaxRate(models.Model):
    name = models.CharField(max_length=50)  # GST 18%, GST 5%, etc.
    rate = models.DecimalField(max_digits=5, decimal_places=2)  # 18.00
    tax_type = models.CharField(max_length=20, default='GST')  # GST, VAT, None
    is_compound = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.name} ({self.rate}%)'

    class Meta:
        ordering = ['rate']


class Account(models.Model):
    ACCOUNT_TYPES = [
        ('asset', 'Asset'),
        ('liability', 'Liability'),
        ('equity', 'Equity'),
        ('revenue', 'Revenue'),
        ('expense', 'Expense'),
        ('bank', 'Bank'),
        ('cash', 'Cash'),
        ('credit_card', 'Credit Card'),
        ('other_current_asset', 'Other Current Asset'),
        ('other_current_liability', 'Other Current Liability'),
        ('accounts_receivable', 'Accounts Receivable'),
        ('accounts_payable', 'Accounts Payable'),
    ]
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, blank=True)
    account_type = models.CharField(max_length=40, choices=ACCOUNT_TYPES)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.code} - {self.name}' if self.code else self.name

    class Meta:
        ordering = ['account_type', 'name']


class Contact(models.Model):
    CONTACT_TYPES = [('customer', 'Customer'), ('vendor', 'Vendor'), ('both', 'Both')]
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    contact_type = models.CharField(max_length=10, choices=CONTACT_TYPES, default='customer')
    company_name = models.CharField(max_length=200)
    display_name = models.CharField(max_length=200)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    billing_address = models.TextField(blank=True)
    billing_city = models.CharField(max_length=100, blank=True)
    billing_state = models.CharField(max_length=100, blank=True)
    billing_pincode = models.CharField(max_length=6, blank=True)
    billing_country = models.CharField(max_length=100, default='India')
    shipping_address = models.TextField(blank=True)
    shipping_city = models.CharField(max_length=100, blank=True)
    shipping_state = models.CharField(max_length=100, blank=True)
    shipping_pincode = models.CharField(max_length=6, blank=True)
    currency = models.CharField(max_length=3, default='INR')
    payment_terms = models.IntegerField(default=30)  # days
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.display_name

    @property
    def outstanding_amount(self):
        from django.db.models import Sum
        invoiced = self.invoices.filter(status__in=['sent', 'partial']).aggregate(
            total=Sum('total_amount'))['total'] or 0
        paid = self.invoices.filter(status__in=['sent', 'partial', 'paid']).aggregate(
            total=Sum('amount_paid'))['total'] or 0
        return invoiced - paid

    class Meta:
        ordering = ['display_name']


class Item(models.Model):
    ITEM_TYPES = [('goods', 'Goods'), ('service', 'Service')]
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    item_type = models.CharField(max_length=10, choices=ITEM_TYPES, default='service')
    sku = models.CharField(max_length=100, blank=True)
    unit = models.CharField(max_length=50, blank=True, default='Nos')
    selling_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    purchase_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sales_tax = models.ForeignKey(TaxRate, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_items')
    purchase_tax = models.ForeignKey(TaxRate, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_items')
    sales_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_items')
    purchase_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_items')
    hsn_sac = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('partial', 'Partially Paid'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('void', 'Void'),
    ]
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Contact, on_delete=models.PROTECT, related_name='invoices')
    invoice_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    reference = models.CharField(max_length=100, blank=True)
    # Amounts
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount_type = models.CharField(max_length=10, choices=[('percent', '%'), ('amount', 'Amount')], default='percent')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    # GST
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    supply_type = models.CharField(max_length=10, choices=[('intra', 'Intra-State'), ('inter', 'Inter-State')], default='intra')
    # Settings
    currency = models.CharField(max_length=3, default='INR')
    notes = models.TextField(blank=True)
    terms = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.invoice_number

    class Meta:
        ordering = ['-invoice_date', '-created_at']


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit = models.CharField(max_length=50, blank=True)
    rate = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_rate = models.ForeignKey(TaxRate, on_delete=models.SET_NULL, null=True, blank=True)
    taxable_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']


class Bill(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('open', 'Open'),
        ('partial', 'Partially Paid'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('void', 'Void'),
    ]
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    bill_number = models.CharField(max_length=50, unique=True)
    vendor_bill_number = models.CharField(max_length=100, blank=True)
    vendor = models.ForeignKey(Contact, on_delete=models.PROTECT, related_name='bills')
    bill_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.bill_number

    class Meta:
        ordering = ['-bill_date']


class BillItem(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    rate = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_rate = models.ForeignKey(TaxRate, on_delete=models.SET_NULL, null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    order = models.IntegerField(default=0)


class Payment(models.Model):
    PAYMENT_MODES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('upi', 'UPI'),
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('neft', 'NEFT'),
        ('rtgs', 'RTGS'),
        ('imps', 'IMPS'),
    ]
    PAYMENT_TYPES = [('received', 'Payment Received'), ('made', 'Payment Made')]
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    payment_number = models.CharField(max_length=50, unique=True)
    payment_type = models.CharField(max_length=10, choices=PAYMENT_TYPES)
    contact = models.ForeignKey(Contact, on_delete=models.PROTECT, related_name='payments')
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODES, default='bank_transfer')
    reference = models.CharField(max_length=100, blank=True)
    bank_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    # Applied to invoices/bills via PaymentAllocation
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.payment_number

    class Meta:
        ordering = ['-payment_date']


class PaymentAllocation(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='allocations')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, null=True, blank=True)
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, null=True, blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)


class Expense(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expense_date = models.DateField()
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, related_name='expenses')
    paid_through = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='expense_payments')
    vendor = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    tax_rate = models.ForeignKey(TaxRate, on_delete=models.SET_NULL, null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    description = models.TextField(blank=True)
    reference = models.CharField(max_length=100, blank=True)
    receipt = models.FileField(upload_to='receipts/', null=True, blank=True)
    is_billable = models.BooleanField(default=False)
    customer = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='billable_expenses')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Expense {self.expense_date} - ₹{self.total_amount}'

    class Meta:
        ordering = ['-expense_date']


class JournalEntry(models.Model):
    STATUS_CHOICES = [('draft', 'Draft'), ('published', 'Published')]
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    entry_number = models.CharField(max_length=50, unique=True)
    entry_date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.entry_number

    class Meta:
        ordering = ['-entry_date']


class JournalEntryLine(models.Model):
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(Account, on_delete=models.PROTECT)
    description = models.TextField(blank=True)
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']
