import { envValidationSchema } from '../../src/config/env.validation';

describe('envValidationSchema', () => {
  const validEnv = {
    BUDGET_API_PORT: 3000,
    BUDGET_API_NODE_ENV: 'development',
    BUDGET_API_KEY: 'test_api_key',
    BUDGET_API_JWT_SECRET: 'test_jwt_secret',
    BUDGET_API_JWT_REFRESH_SECRET: 'test_refresh_secret',
    BUDGET_API_REGISTRATION_INVITE_CODE: 'INVITE123',
    BUDGET_API_MONGO_URI: 'mongodb://localhost:27017/budget_test',
  };

  it('should validate complete valid environment variables', () => {
    const { error, value } = envValidationSchema.validate(validEnv);
    expect(error).toBeUndefined();
    expect(value.BUDGET_API_PORT).toBe(3000);
    expect(value.BUDGET_API_KEY).toBe('test_api_key');
    expect(value.BUDGET_API_JWT_SECRET).toBe('test_jwt_secret');
  });

  it('should fail if BUDGET_API_KEY is missing', () => {
    const invalidEnv = { ...validEnv };
    delete (invalidEnv as any).BUDGET_API_KEY;

    const { error } = envValidationSchema.validate(invalidEnv);
    expect(error).toBeDefined();
    expect(error?.message).toContain('"BUDGET_API_KEY" is required');
  });

  it('should fail if BUDGET_API_MONGO_URI is missing', () => {
    const invalidEnv = { ...validEnv };
    delete (invalidEnv as any).BUDGET_API_MONGO_URI;

    const { error } = envValidationSchema.validate(invalidEnv);
    expect(error).toBeDefined();
    expect(error?.message).toContain('"BUDGET_API_MONGO_URI" is required');
  });

  it('should fail if BUDGET_API_REGISTRATION_INVITE_CODE is missing', () => {
    const invalidEnv = { ...validEnv };
    delete (invalidEnv as any).BUDGET_API_REGISTRATION_INVITE_CODE;

    const { error } = envValidationSchema.validate(invalidEnv);
    expect(error).toBeDefined();
    expect(error?.message).toContain('"BUDGET_API_REGISTRATION_INVITE_CODE" is required');
  });

  it('should apply defaults for BUDGET_API_PORT and BUDGET_API_NODE_ENV', () => {
    const minimalEnv = {
      BUDGET_API_KEY: 'test_api_key',
      BUDGET_API_JWT_SECRET: 'test_jwt_secret',
      BUDGET_API_JWT_REFRESH_SECRET: 'test_refresh_secret',
      BUDGET_API_REGISTRATION_INVITE_CODE: 'INVITE123',
      BUDGET_API_MONGO_URI: 'mongodb://localhost:27017/budget_test',
    };

    const { error, value } = envValidationSchema.validate(minimalEnv);
    expect(error).toBeUndefined();
    expect(value.BUDGET_API_PORT).toBe(3000);
    expect(value.BUDGET_API_NODE_ENV).toBe('development');
    expect(value.BUDGET_API_JWT_EXPIRES_IN).toBe('1h');
    expect(value.BUDGET_API_ALLOW_REGISTRATION).toBe(false);
  });

  it('should parse BUDGET_API_ALLOW_REGISTRATION boolean values properly', () => {
    const envWithTrue = { ...validEnv, BUDGET_API_ALLOW_REGISTRATION: 'true' };
    const { value: valTrue } = envValidationSchema.validate(envWithTrue);
    expect(valTrue.BUDGET_API_ALLOW_REGISTRATION).toBe(true);

    const envWithFalse = { ...validEnv, BUDGET_API_ALLOW_REGISTRATION: false };
    const { value: valFalse } = envValidationSchema.validate(envWithFalse);
    expect(valFalse.BUDGET_API_ALLOW_REGISTRATION).toBe(false);
  });
});
