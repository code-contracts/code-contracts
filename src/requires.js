import CodeContractError from "./CodeContractError";

const PARAMETERS_PATTERN = /^function\s*\S*\s*\((.+?)\)|^\((.+?)\)\s*=>|^(\S+)\s*=>/;
const metaMap = new WeakMap();

/**
 * @param {any} x - A value to check.
 * @returns {boolean} Whether or not the value is a function.
 */
function isFunction(x) {
  return typeof x === "function";
}

/**
 * Call a function with specified context and args.
 * @param {function} f - A function to call.
 * @param {any} context - A value to bind to this.
 * @param {any[]} args - Arguments to give to the function.
 * @returns {any} the return value of the function.
 */
function call(f, context, args) {
  return f.apply(context, args);
}

/**
 * @param {function} f - A function to get parameters.
 * @returns {string[]} An array of parameter names.
 */
function getParameters(f) {
  const m = PARAMETERS_PATTERN.exec(f.toString());
  if (m == null) {
    return [];
  }
  return (m[1] || m[2] || m[3]).split(",").map(s => s.trim());
}

/**
 * @param {function} f - A function to get parameters.
 * @returns {object} A map that associates to its index from each parameter name.
 */
function getParametersMap(f) {
  return getParameters(f).reduce((map, name, index) => {
    map[name] = index;
    return map;
  }, Object.create(null));
}

/**
 * Meta-info for condition checker.
 */
class Meta {
    /**
     * @param {function} target - a validation target.
     */
    constructor(target) {
        this.target = target;
        this.parametersMap = getParametersMap(target);
        this.preconditions = [];
    }

    /**
     * Add a precondition.
     * @param {function} condition - A function that means a precondition.
     */
    addPrecondition(condition) {
      const parameters = getParameters(condition);
      if (parameters.length === 0) {
        throw new CodeContractError(
          "condition should have one or more parameters.",
          this.target,
          condition);
      }
      if (parameters.some(name => name !== "$this" && this.parametersMap[name] == null)) {
        throw new CodeContractError(
          "condition's parameters should be `$this` or actual parameter names.",
          this.target,
          condition);
      }

      this.preconditions.push({condition, parameters});
    }

    /**
     * Define a wrapped function for this.target.
     * @returns {any} a return value of this.target.
     */
    defineContractFunction() {
      const meta = this;
      return function(...args) {
        meta.validatePrecondition(this, args);
        return call(meta.target, this, args);
      };
    }


    /**
     * Validate a context object (`$this`) and arguments.
     * @param {object} $this - A context object.
     * @param {any[]} args - arguments.
     * @private
     */
    validatePrecondition($this, args) {
      this.preconditions.forEach(item => {
        const retv = call(
          item.condition,
          $this,
          item.parameters.map(name =>
            name === "$this" ? $this : args[this.parametersMap[name]]
          )
        );
        if (!retv) {
          throw new CodeContractError(
            "invalid arguments: " + item.parameters.join(", "),
            this.target,
            item.condition);
        }
      });
    }
}

function setupFunctionRequires(target, condition) {
  let meta = metaMap.get(target);
  if (meta == null) {
    meta = new Meta(target);
    target = meta.defineContractFunction();
    metaMap.set(target, meta);
  }
  meta.addPrecondition(condition);
  return target;
}

function setupMethodRequires(descriptor, condition) {
  descriptor.value = setupFunctionRequires(descriptor.value, condition);
}

function setupGetterSetterRequires(descriptor, condition) {
  if (isFunction(descriptor.set)) {
    descriptor.set = setupFunctionRequires(descriptor.set, condition);
  }
}

/**
 * ES7 Decorator declaration for `requires`.
 *
 * @param {function} condition - A function that describes pre-conditions.
 * @return {function} An ES7 decorator to setup pre-condition checks.
 */
export default function requires(condition) {
  if (!isFunction(condition)) {
    throw new TypeError("condition should be a function.");
  }

  return function requires(target, name, descriptor) {
    if (name === undefined && descriptor === undefined) {
      // Attached to a independent stuff.
      if (isFunction(target)) {
        // Attached to a function or a class.
        return setupFunctionRequires(target, condition);
      }
    }
    else {
      if (descriptor === undefined) {
        // Attached to an instance member.
        // In this case, descripter is nothing, so get it.
        // See Also: https://github.com/wycats/javascript-decorators#object-literal-method-declaration
        descriptor = Object.getOwnPropertyDescriptor(target, name);
      }

      if (isFunction(descriptor.value)) {
        // Attached to a method.
        return setupMethodRequires(descriptor, condition);
      }
      if (isFunction(descriptor.get) || isFunction(descriptor.set)) {
        // Attached to a getter/setter property.
        return setupGetterSetterRequires(descriptor, condition);
      }
    }

    throw new CodeContractError("@requires should attach to a function, a class, a method, or a setter property.");
  };
}
