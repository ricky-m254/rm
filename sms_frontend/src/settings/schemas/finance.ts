import type { SettingsSchema } from '../types'

const financeSettings: SettingsSchema = {
  module: 'finance',
  title: 'Finance Settings',
  description: 'Configuration for billing, payments, and financial controls.',
  settings: [
    {
      key: 'defaultCurrency',
      label: 'Default Currency',
      description: 'Currency used across all finance reports, invoices, and payments.',
      type: 'select',
      defaultValue: 'KES',
      options: [
        { value: 'KES', label: 'KES — Kenyan Shilling (Ksh)' },
        { value: 'USD', label: 'USD — US Dollar ($)' },
        { value: 'EUR', label: 'EUR — Euro (€)' },
        { value: 'GBP', label: 'GBP — British Pound (£)' },
        { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
        { value: 'UGX', label: 'UGX — Ugandan Shilling' },
        { value: 'ZAR', label: 'ZAR — South African Rand (R)' },
      ],
    },
    {
      key: 'allowPartialPayments',
      label: 'Allow Partial Payments',
      description: 'Permit payments that do not settle the full invoice balance.',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'lateFeeType',
      label: 'Late Fee Type',
      description: 'Choose whether late fees are percentage-based or fixed.',
      type: 'select',
      defaultValue: 'percentage',
      options: [
        { value: 'percentage', label: 'Percentage' },
        { value: 'fixed', label: 'Fixed Amount' },
      ],
    },
    {
      key: 'lateFeeValue',
      label: 'Late Fee Value',
      description: 'Percentage or fixed amount applied to overdue invoices.',
      type: 'percentage',
      defaultValue: 5,
    },
    {
      key: 'allowOverpayment',
      label: 'Allow Overpayment (Carry Forward)',
      description: 'Carry forward overpaid amounts to future invoices.',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'lockFinancialPeriods',
      label: 'Lock Financial Periods',
      description: 'Prevent edits for closed financial periods.',
      type: 'boolean',
      defaultValue: false,
      requiredPermission: 'finance:lock_periods',
    },
    {
      key: 'invoiceNumberFormat',
      label: 'Invoice Numbering Format',
      description: 'Pattern used for invoice identifiers.',
      type: 'string',
      defaultValue: 'INV-{YYYY}-{SEQ}',
    },
    {
      key: 'receiptNumberFormat',
      label: 'Receipt Numbering Format',
      description: 'Pattern used for receipt identifiers.',
      type: 'string',
      defaultValue: 'RCT-{YYYY}-{SEQ}',
    },
    {
      key: 'paymentGatewayProvider',
      label: 'Payment Gateway Provider',
      description: 'Placeholder mode until live gateway keys are approved.',
      type: 'select',
      defaultValue: 'placeholder',
      options: [
        { value: 'placeholder', label: 'Placeholder' },
        { value: 'stripe', label: 'Stripe' },
        { value: 'flutterwave', label: 'Flutterwave' },
        { value: 'paystack', label: 'Paystack' },
      ],
      requiredPermission: 'finance:configure_gateway',
    },
    {
      key: 'paymentGatewayApiKey',
      label: 'Payment Gateway API Key',
      description: 'Store in backend env for production; keep empty in development.',
      type: 'string',
      defaultValue: '',
      requiredPermission: 'finance:configure_gateway',
    },
  ],
}

export default financeSettings
