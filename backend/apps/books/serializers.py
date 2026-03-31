from rest_framework import serializers
from .models import (TaxRate, Account, Contact, Item, Invoice, InvoiceItem,
                     Bill, BillItem, Payment, PaymentAllocation, Expense, JournalEntry, JournalEntryLine)


class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = '__all__'


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = '__all__'


class ContactSerializer(serializers.ModelSerializer):
    outstanding_amount = serializers.ReadOnlyField()
    class Meta:
        model = Contact
        fields = '__all__'


class ContactListSerializer(serializers.ModelSerializer):
    outstanding_amount = serializers.ReadOnlyField()
    class Meta:
        model = Contact
        fields = ['id', 'uuid', 'contact_type', 'company_name', 'display_name',
                  'email', 'phone', 'gstin', 'currency', 'outstanding_amount', 'is_active']


class ItemSerializer(serializers.ModelSerializer):
    sales_tax_name = serializers.CharField(source='sales_tax.name', read_only=True)
    class Meta:
        model = Item
        fields = '__all__'


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.display_name', read_only=True)
    customer_gstin = serializers.CharField(source='customer.gstin', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'


class InvoiceListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.display_name', read_only=True)
    class Meta:
        model = Invoice
        fields = ['id', 'uuid', 'invoice_number', 'customer', 'customer_name',
                  'invoice_date', 'due_date', 'status', 'total_amount', 'amount_paid', 'balance_due']


class InvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['invoice_number']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)
        for i, item_data in enumerate(items_data):
            InvoiceItem.objects.create(invoice=invoice, order=i, **item_data)
        return invoice


class BillItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillItem
        fields = '__all__'


class BillSerializer(serializers.ModelSerializer):
    items = BillItemSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.display_name', read_only=True)
    class Meta:
        model = Bill
        fields = '__all__'


class BillListSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.display_name', read_only=True)
    class Meta:
        model = Bill
        fields = ['id', 'uuid', 'bill_number', 'vendor', 'vendor_name',
                  'bill_date', 'due_date', 'status', 'total_amount', 'balance_due']


class PaymentAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAllocation
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    allocations = PaymentAllocationSerializer(many=True, read_only=True)
    contact_name = serializers.CharField(source='contact.display_name', read_only=True)
    class Meta:
        model = Payment
        fields = '__all__'


class ExpenseSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.display_name', read_only=True, default='')
    class Meta:
        model = Expense
        fields = '__all__'


class JournalEntryLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    class Meta:
        model = JournalEntryLine
        fields = '__all__'


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True, read_only=True)
    class Meta:
        model = JournalEntry
        fields = '__all__'
