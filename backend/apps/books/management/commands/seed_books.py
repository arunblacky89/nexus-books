from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import random


class Command(BaseCommand):
    help = 'Seed NexusBooks with demo data'

    def handle(self, *args, **kwargs):
        from apps.accounts.models import Organization, User
        from apps.books.models import TaxRate, Account, Contact, Item, Invoice, InvoiceItem, Bill, BillItem, Expense

        self.stdout.write('Seeding NexusBooks demo data...')

        # Organization
        org, _ = Organization.objects.get_or_create(
            name='Acme Technologies Pvt Ltd',
            defaults={
                'gstin': '27AABCU9603R1ZX',
                'pan': 'AABCU9603R',
                'address': '42 MG Road, Bandra West',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'pincode': '400050',
                'phone': '+91 98765 43210',
                'email': 'accounts@acmetech.in',
                'website': 'https://acmetech.in',
                'currency': 'INR',
            }
        )

        # Admin user — SAME PASSWORD FOR ALL NEXUS APPS
        if not User.objects.filter(username='admin').exists():
            user = User.objects.create_superuser(
                username='admin',
                email='admin@nexusbooks.com',
                password='Admin@2024',
                first_name='Admin',
                last_name='User',
                organization=org,
                role='admin',
            )
            self.stdout.write(self.style.SUCCESS('✓ Admin user created: admin / Admin@2024'))

        # Tax Rates
        taxes = [
            ('GST 0%', 0, 'GST'),
            ('GST 5%', 5, 'GST'),
            ('GST 12%', 12, 'GST'),
            ('GST 18%', 18, 'GST'),
            ('GST 28%', 28, 'GST'),
            ('No Tax', 0, 'None'),
        ]
        tax_objects = {}
        for name, rate, ttype in taxes:
            t, _ = TaxRate.objects.get_or_create(name=name, defaults={'rate': rate, 'tax_type': ttype})
            tax_objects[name] = t

        # Chart of Accounts
        accounts_data = [
            ('Cash', '1000', 'cash'),
            ('HDFC Bank - Current', '1010', 'bank'),
            ('ICICI Bank - Savings', '1011', 'bank'),
            ('Accounts Receivable', '1100', 'accounts_receivable'),
            ('Office Supplies', '1200', 'other_current_asset'),
            ('Furniture & Fixtures', '1500', 'asset'),
            ('Computer Equipment', '1510', 'asset'),
            ('Accounts Payable', '2000', 'accounts_payable'),
            ('GST Payable', '2100', 'other_current_liability'),
            ('TDS Payable', '2101', 'other_current_liability'),
            ('Share Capital', '3000', 'equity'),
            ('Retained Earnings', '3100', 'equity'),
            ('Software Revenue', '4000', 'revenue'),
            ('Consulting Revenue', '4001', 'revenue'),
            ('SaaS Revenue', '4002', 'revenue'),
            ('Salaries & Wages', '5000', 'expense'),
            ('Rent & Office', '5001', 'expense'),
            ('Travel & Conveyance', '5002', 'expense'),
            ('Utilities', '5003', 'expense'),
            ('Marketing & Advertising', '5004', 'expense'),
            ('Professional Fees', '5005', 'expense'),
            ('Software Subscriptions', '5006', 'expense'),
            ('Bank Charges', '5007', 'expense'),
            ('Depreciation', '5008', 'expense'),
            ('Miscellaneous', '5009', 'expense'),
        ]
        account_objects = {}
        for name, code, atype in accounts_data:
            a, _ = Account.objects.get_or_create(code=code, defaults={'name': name, 'account_type': atype})
            account_objects[code] = a

        # Customers
        customers_data = [
            ('TechCorp Solutions', 'TechCorp Solutions', 'customer', 'contact@techcorp.in', '+91 98001 11111', '27AABCT1234A1Z5'),
            ('Global Retail Pvt Ltd', 'Global Retail Pvt Ltd', 'customer', 'ap@globalretail.com', '+91 98002 22222', '29AABCG5678B1Z3'),
            ('Sunrise Exports', 'Sunrise Exports', 'customer', 'finance@sunriseexports.in', '+91 98003 33333', '24AABCS9012C1Z1'),
            ('MegaMart Hypermarket', 'MegaMart Hypermarket', 'customer', 'billing@megamart.in', '+91 98004 44444', '27AABCM3456D1Z9'),
            ('Infosys Limited', 'Infosys Limited', 'customer', 'vendor@infosys.com', '+91 98005 55555', '29AABCI7890E1Z7'),
            ('Wipro Technologies', 'Wipro Technologies', 'customer', 'accounts@wipro.com', '+91 98006 66666', '29AABCW2345F1Z5'),
            ('Healthcare Plus', 'Healthcare Plus', 'customer', 'billing@healthcareplus.in', '+91 98007 77777', '27AABCH6789G1Z3'),
            ('EduLearn Academy', 'EduLearn Academy', 'customer', 'finance@edulearn.in', '+91 98008 88888', '27AABCE1234H1Z1'),
        ]
        customer_objects = []
        for cd in customers_data:
            c, _ = Contact.objects.get_or_create(
                display_name=cd[0],
                defaults={
                    'company_name': cd[0], 'contact_type': cd[2],
                    'email': cd[3], 'phone': cd[4], 'gstin': cd[5],
                    'billing_city': 'Mumbai', 'billing_state': 'Maharashtra',
                    'currency': 'INR', 'payment_terms': 30,
                }
            )
            customer_objects.append(c)

        # Vendors
        vendors_data = [
            ('AWS India', 'AWS India', 'vendor', 'billing@aws.amazon.in', '+1 800 111 1111', ''),
            ('Zoho Corporation', 'Zoho Corporation', 'vendor', 'support@zoho.com', '+91 44 1234 5678', '33AABCZ5678A1Z2'),
            ('Office Depot India', 'Office Depot India', 'vendor', 'sales@officedepot.in', '+91 80 9876 5432', '29AABCO9012B1Z8'),
        ]
        vendor_objects = []
        for vd in vendors_data:
            v, _ = Contact.objects.get_or_create(
                display_name=vd[0],
                defaults={
                    'company_name': vd[0], 'contact_type': vd[2],
                    'email': vd[3], 'phone': vd[4], 'gstin': vd[5],
                }
            )
            vendor_objects.append(v)

        # Items
        items_data = [
            ('SaaS Platform License', 'service', 'Annual SaaS license fee', 50000, 'SAC001', tax_objects['GST 18%']),
            ('Implementation Services', 'service', 'Custom implementation and setup', 25000, 'SAC002', tax_objects['GST 18%']),
            ('Training Package', 'service', 'User training sessions', 15000, 'SAC003', tax_objects['GST 18%']),
            ('API Integration', 'service', 'Third-party API integration', 30000, 'SAC004', tax_objects['GST 18%']),
            ('Support & Maintenance', 'service', 'Annual support contract', 12000, 'SAC005', tax_objects['GST 18%']),
            ('Cloud Hosting (Monthly)', 'service', 'Cloud infrastructure hosting', 8000, 'SAC006', tax_objects['GST 18%']),
            ('Mobile App Development', 'service', 'iOS and Android app development', 150000, 'SAC007', tax_objects['GST 18%']),
            ('Data Migration', 'service', 'Legacy data migration service', 20000, 'SAC008', tax_objects['GST 18%']),
        ]
        item_objects = []
        for idata in items_data:
            item, _ = Item.objects.get_or_create(
                name=idata[0],
                defaults={
                    'item_type': idata[1], 'description': idata[2],
                    'selling_price': idata[3], 'hsn_sac': idata[4],
                    'sales_tax': idata[5], 'unit': 'Nos',
                    'sales_account': account_objects.get('4002'),
                }
            )
            item_objects.append(item)

        # Generate Invoices for last 6 months
        today = date.today()
        invoice_num = Invoice.objects.count()
        for i in range(30):
            invoice_num += 1
            inv_date = today - timedelta(days=random.randint(1, 180))
            due_date = inv_date + timedelta(days=30)
            customer = random.choice(customer_objects)
            status_choices = ['sent', 'paid', 'partial', 'overdue', 'draft']
            weights = [30, 35, 15, 10, 10]
            inv_status = random.choices(status_choices, weights=weights)[0]
            if inv_date + timedelta(days=30) < today and inv_status == 'sent':
                inv_status = 'overdue'

            inv = Invoice.objects.create(
                invoice_number=f'INV-{invoice_num:05d}',
                customer=customer,
                invoice_date=inv_date,
                due_date=due_date,
                status=inv_status,
                supply_type='intra',
                currency='INR',
                notes='Thank you for your business!',
                terms='Payment due within 30 days.',
            )

            # Add 1-3 line items
            subtotal = Decimal('0')
            tax_total = Decimal('0')
            for j in range(random.randint(1, 3)):
                item = random.choice(item_objects)
                qty = Decimal(str(random.randint(1, 5)))
                rate = item.selling_price
                discount = Decimal('0')
                taxable = (qty * rate) - discount
                tax_rate = item.sales_tax
                tax_amt = (taxable * tax_rate.rate / 100).quantize(Decimal('0.01'))
                line_total = taxable + tax_amt
                InvoiceItem.objects.create(
                    invoice=inv,
                    item=item,
                    description=item.description,
                    quantity=qty,
                    unit='Nos',
                    rate=rate,
                    tax_rate=tax_rate,
                    taxable_amount=taxable,
                    tax_amount=tax_amt,
                    amount=line_total,
                    order=j,
                )
                subtotal += taxable
                tax_total += tax_amt

            total = subtotal + tax_total
            cgst = (tax_total / 2).quantize(Decimal('0.01'))
            sgst = tax_total - cgst

            paid = total if inv_status == 'paid' else (total / 2).quantize(Decimal('0.01')) if inv_status == 'partial' else Decimal('0')

            inv.subtotal = subtotal
            inv.taxable_amount = subtotal
            inv.tax_amount = tax_total
            inv.total_amount = total
            inv.amount_paid = paid
            inv.balance_due = total - paid
            inv.cgst_amount = cgst
            inv.sgst_amount = sgst
            inv.save()

        # Generate Expenses
        expense_accounts = [
            (account_objects['5000'], 'Salaries & Wages', 150000),
            (account_objects['5001'], 'Monthly Office Rent', 45000),
            (account_objects['5002'], 'Client Visit Travel', 8500),
            (account_objects['5003'], 'Electricity Bill', 12000),
            (account_objects['5004'], 'Google Ads Campaign', 25000),
            (account_objects['5005'], 'CA Fees', 15000),
            (account_objects['5006'], 'AWS Cloud Services', 18000),
            (account_objects['5007'], 'Bank Processing Fees', 2500),
        ]
        for exp_acc, desc, amount in expense_accounts:
            for month_offset in range(3):
                exp_date = today.replace(day=random.randint(1, 28)) - timedelta(days=month_offset * 30)
                tax = tax_objects['GST 18%'] if 'Ads' in desc or 'AWS' in desc or 'Cloud' in desc else None
                tax_amt = Decimal(str(amount)) * Decimal('0.18') if tax else Decimal('0')
                Expense.objects.get_or_create(
                    expense_date=exp_date,
                    account=exp_acc,
                    description=desc,
                    defaults={
                        'amount': amount,
                        'tax_rate': tax,
                        'tax_amount': tax_amt,
                        'total_amount': Decimal(str(amount)) + tax_amt,
                        'paid_through': account_objects.get('1010'),
                    }
                )

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ NexusBooks seeded successfully!\n'
            f'   URL: http://localhost\n'
            f'   Login: admin / Admin@2024\n'
            f'   Invoices: {Invoice.objects.count()}\n'
            f'   Contacts: {Contact.objects.count()}\n'
            f'   Expenses: {Expense.objects.count()}\n'
        ))
