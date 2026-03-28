// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Validation Middleware
// ═══════════════════════════════════════════════════

/**
 * Generic validation middleware factory.
 * Accepts a schema object where each key maps to an array of validator functions.
 *
 * Usage:
 *   validate({
 *     email:    [required("Email"), isEmail()],
 *     password: [required("Password"), minLength("Password", 6)],
 *   })
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, validators] of Object.entries(schema)) {
      const value = req.body[field];
      for (const validator of validators) {
        const error = validator(value, field);
        if (error) {
          errors.push(error);
          break; // stop at first error per field
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors,
      });
    }

    next();
  };
};

// ── Validator Functions ──────────────────────────────

const required = (label) => (value) => {
  if (value === undefined || value === null || value === "") {
    return `${label} is required`;
  }
  return null;
};

const minLength = (label, min) => (value) => {
  if (typeof value === "string" && value.length < min) {
    return `${label} must be at least ${min} characters`;
  }
  return null;
};

const maxLength = (label, max) => (value) => {
  if (typeof value === "string" && value.length > max) {
    return `${label} cannot exceed ${max} characters`;
  }
  return null;
};

const isEmail = () => (value) => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (typeof value === "string" && !emailRegex.test(value)) {
    return "Please provide a valid email address";
  }
  return null;
};

const isURL = (label) => (value) => {
  try {
    if (value) new URL(value);
    return null;
  } catch {
    return `${label} must be a valid URL`;
  }
};

const isGitHubURL = () => (value) => {
  const regex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/;
  if (typeof value === "string" && !regex.test(value)) {
    return "Please provide a valid GitHub repository URL (e.g. https://github.com/user/repo)";
  }
  return null;
};

const isIn = (label, allowedValues) => (value) => {
  if (value && !allowedValues.includes(value)) {
    return `${label} must be one of: ${allowedValues.join(", ")}`;
  }
  return null;
};

module.exports = {
  validate,
  required,
  minLength,
  maxLength,
  isEmail,
  isURL,
  isGitHubURL,
  isIn,
};
