import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  BUDGET_API_PORT: Joi.number().default(3000),
  BUDGET_API_NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  BUDGET_API_JWT_SECRET: Joi.string().required(),
  BUDGET_API_JWT_EXPIRES_IN: Joi.string().default('1h'),
  BUDGET_API_JWT_REFRESH_SECRET: Joi.string().required(),
  BUDGET_API_JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BUDGET_API_REGISTRATION_INVITE_CODE: Joi.string().required(),
  BUDGET_API_MONGO_URI: Joi.string().uri().required(),
  BUDGET_API_VAPID_PUBLIC_KEY: Joi.string().allow('').optional(),
  BUDGET_API_VAPID_PRIVATE_KEY: Joi.string().allow('').optional(),
  BUDGET_API_VAPID_SUBJECT: Joi.string().allow('').optional(),
  BUDGET_API_EMAIL_PROVIDER: Joi.string().valid('smtp', 'resend').default('smtp'),
  BUDGET_API_SMTP_HOST: Joi.string().allow('').optional(),
  BUDGET_API_SMTP_PORT: Joi.number().allow(null).optional(),
  BUDGET_API_SMTP_USER: Joi.string().allow('').optional(),
  BUDGET_API_SMTP_PASS: Joi.string().allow('').optional(),
  BUDGET_API_SMTP_FROM: Joi.string().allow('').optional(),
  BUDGET_API_RESEND_API_KEY: Joi.string().allow('').optional(),
});
