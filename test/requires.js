import assert from "power-assert";
import requires from "../src/requires.js";
import CodeContractError from "../src/CodeContractError.js";

describe("The requires decorator:", () => {
  describe("when set to a method,", () => {
    class A {
      @requires(a => a % 2 === 0)
      method1(a) { return a; }

      @requires((a) => a % 2 === 0)
      method2(a) { return a; }

      @requires((a, b) => (a + b) % 2 === 0)
      method3(a, b) { return a + b; }
    }

    it("should passthrough if the condition fulfilled.", () => {
      let a = new A();
      assert(a.method1(2) === 2);
      assert(a.method2(2) === 2);
      assert(a.method3(1, 1) === 2);
    });

    it("should throw an error if the condition rejected.", () => {
      let a = new A();
      assert.throws(() => a.method1(1), CodeContractError);
      assert.throws(() => a.method2(1), CodeContractError);
      assert.throws(() => a.method3(1, 2), CodeContractError);
    });

    it("should throw an error if some of argument names are mismatched.", () => {
      assert.throws(
        () => class B {
          @requires(a => a % 2 === 0)
          method1(b) { return b; }
        },
        CodeContractError);

      assert.throws(
        () => class B {
          @requires((a, b) => (a + b) % 2 === 0)
          method1(a, c) { return a + c; }
        },
        CodeContractError);
    });

    class C {
      @requires(a => a % 2 === 0)
      @requires(b => b % 2 === 1)
      method1(a, b) {
        return a + b;
      }
    }

    it("should work if there are multiple requires.", () => {
      let c = new C();
      assert(c.method1(2, 1) === 3);
      assert.throws(() => c.method1(1, 1), CodeContractError);
      assert.throws(() => c.method1(2, 2), CodeContractError);
      assert.throws(() => c.method1(1, 2), CodeContractError);
    });
  });

  describe("when set to a setter property,", () => {
    class A {
      get prop1() { return this._prop1; }

      @requires(value => value % 2 === 0)
      set prop1(value) { this._prop1 = value; }
    }

    it("should passthrough if the condition fulfilled.", () => {
      let a = new A();
      assert(a.prop1 = 2, a.prop1 === 2);
    });

    it("should throw an error if the condition rejected.", () => {
      let a = new A();
      assert.throws(() => a.prop1 = 1, CodeContractError);
    });

    it("should throw an error if the argument name is mismatched.", () => {
      assert.throws(
        () => class B {
          @requires(a => a % 2 === 0)
          set prop1(b) { return b; }
        },
        CodeContractError);
    });

    class C {
      @requires(a => a % 2 === 0)
      @requires(a => a !== 0)
      method1(a, b) {
        return a + b;
      }
    }

    it("should work if there are multiple requires.", () => {
      let c = new C();
      assert(c.method1(2, 1) === 3);
      assert.throws(() => c.method1(1, 1), CodeContractError);
    });
  });
});
