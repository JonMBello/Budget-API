import { envValidationSchema } from '../../src/config/env.validation';

describe('envValidationSchema', () => {
  const validEnv = {
    PORT: 3000,
    NODE_ENV: 'development',
    JWT_SECRET: 'test_jwt_secret',
    JWT_REFRESH_SECRET: 'test_refresh_secret',
    REGISTRATION_INVITE_CODE: 'INVITE123',
    MONGO_URI: 'mongodb://localhost:27017/budget_test',
  };

  it('should validate complete valid environment variables', () => {
    const { error, value } = envValidationSchema.validate(validEnv);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.JWT_SECRET).toBe('test_jwt_secret');
  });

  it('should fail if MONGO_URI is missing', () => {
    const invalidEnv = { ...validEnv };
    delete (invalidEnv as any).MONGO_URI;

    const { error } = envValidationSchema.validate(invalidEnv);
    expect(error).toBeDefined();
    expect(error?.message).toContain('"MONGO_URI" is required');
  });

  it('should fail if REGISTRATION_INVITE_CODE is missing', () => {
    const invalidEnv = { ...validEnv };
    delete (invalidEnv as any).REGISTRATION_INVITE_CODE;

    const { error } = envValidationSchema.validate(invalidEnv);
    expect(error).toBeDefined();
    expect(error?.message).toContain('"REGISTRATION_INVITE_CODE" is required');
  });

  it('should apply defaults for PORT and NODE_ENV', () => {
    const minimalEnv = {
      JWT_SECRET: 'test_jwt_secret',
      JWT_REFRESH_SECRET: 'test_refresh_secret',
      REGISTRATION_INVITE_CODE: 'INVITE123',
      MONGO_URI: 'mongodb://localhost:27017/budget_test',
    };

    const { error, value } = envValidationSchema.validate(minimalEnv);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.NODE_ENV).toBe('development');
    expect(value.JWT_EXPIRES_IN).toBe('1h');
  });
});
