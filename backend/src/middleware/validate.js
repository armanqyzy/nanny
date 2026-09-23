const { z } = require('zod');

function formatIssue(issue) {
  const path = issue.path?.length ? issue.path.join('.') : 'request';
  return `${path}: ${issue.message}`;
}

function validate(source, schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const error = new Error(parsed.error.issues.map(formatIssue).join('; '));
      error.status = 400;
      error.details = parsed.error.flatten();
      return next(error);
    }

    req[source] = parsed.data;
    return next();
  };
}

const common = {
  idParam: z.object({
    id: z.coerce.number().int().positive(),
  }),
};

module.exports = {
  validateBody: (schema) => validate('body', schema),
  validateQuery: (schema) => validate('query', schema),
  validateParams: (schema) => validate('params', schema),
  z,
  common,
};
