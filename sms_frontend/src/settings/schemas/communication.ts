import type { SettingsSchema } from '../types'

const communicationSettings: SettingsSchema = {
  module: 'communication',
  title: 'Communication Settings',
  description: 'Provider placeholders for Email, SMS, and WhatsApp. Use test/free modes until production keys are available.',
  settings: [
    {
      key: 'emailProvider',
      label: 'Email Provider',
      description: 'Use SMTP or local console backend for development.',
      type: 'select',
      defaultValue: 'smtp',
      options: [
        { value: 'smtp', label: 'SMTP (Recommended)' },
        { value: 'console', label: 'Console' },
      ],
    },
    {
      key: 'emailFromAddress',
      label: 'Default From Email',
      description: 'Sender email used for transactional and campaign messages.',
      type: 'string',
      defaultValue: 'noreply@sms.local',
    },
    {
      key: 'smsProvider',
      label: 'SMS Provider',
      description: 'Set to placeholder until provider API key is configured.',
      type: 'select',
      defaultValue: 'placeholder',
      options: [
        { value: 'placeholder', label: 'Placeholder' },
        { value: 'twilio', label: 'Twilio' },
        { value: 'africastalking', label: "Africa's Talking" },
      ],
    },
    {
      key: 'smsApiKey',
      label: 'SMS API Key',
      description: 'Leave blank in development. Set env var in backend for production.',
      type: 'string',
      defaultValue: '',
      requiredPermission: 'communication:configure_providers',
    },
    {
      key: 'whatsappProvider',
      label: 'WhatsApp Provider',
      description: 'Placeholder mode supported when no key is available.',
      type: 'select',
      defaultValue: 'placeholder',
      options: [
        { value: 'placeholder', label: 'Placeholder' },
        { value: 'twilio_whatsapp', label: 'Twilio WhatsApp' },
      ],
    },
    {
      key: 'whatsappApiKey',
      label: 'WhatsApp API Key',
      description: 'Backend placeholder transport is used when this is empty.',
      type: 'string',
      defaultValue: '',
      requiredPermission: 'communication:configure_providers',
    },
  ],
}

export default communicationSettings

