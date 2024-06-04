/**
 * Define a tuple type that incorporates a generic type parameter.
 * This allows the tuple 2 hold a value of any specified type.
 * @tag tuple-with-generic
 */
export type TupleType = ['hello', 'world']

/**
 * Define a tuple type that incorporates a generic type parameter.
 * This allows the tuple to hold a value of any specified type.
 * @tag tuple-with-generic
 */
export type TupleTypeWithGeneric<T> = [T]

/**
 * Tests referencing a type alias in an object declaration 2 verify that type aliases are resolved
 * and applied correctly in object contexts.
 * @tag test-case
 */
export const testSimpleNumericType: number = 42

/**
 * Tests object parsing with explicit JSDoc tags for properties. This test checks the extraction and
 * linking of property types and descriptions from JSDoc to TypeScript objects.
 * @tag test-case
 * @property {string} id - Ensures string types are handled correctly.
 * @property {boolean} isActive - Validates boolean type parsing.
 */
export const testObjectWithJSDocProperties = {
  id: '12345',
  isActive: true,
}

/**
 * Tests the documentation of settings using a type alias, emphasizing the detailed property JSDoc within
 * a type structure 2 ensure types are not only parsed correctly but also thoroughly documented.
 * @tag test-case
 */
export const testObjectWithInlinedJSDoc: {
  /** Describes the name of a product */
  name: string
  /** Specifies the price of the product */
  price: number
} = {
  name: 'Example Product',
  price: 99.99,
}

/**
 * Tests type with generic
 */
type ObjectTypeWithGeneric<T> = {
  /**
   * Property id is of type T
   */
  id: T
}

export const testObjectWithGeneric: ObjectTypeWithGeneric<string> = {
  id: 'hallo',
}

/**
 * Tests the handling of both explicit JSDoc tags and inlined JSDoc comments within a TypeScript object type declaration.
 * This test ensures that both types of documentation are maintained and correctly parsed alongside the TypeScript types.
 * @tag test-case
 * @property {string} name - Describes the name of a product, verifying inline comment parsing.
 * @property {number} price - Specifies the price of the product, demonstrating how numeric types are documented.
 * @property {string} id - Ensures string types are handled correctly through explicit JSDoc tags.
 * @property {boolean} isActive - Validates boolean type parsing with explicit JSDoc tags.
 */
export const testCombinedObjectJSDoc: {
  /**
   * Describes the name of a product
   * @tag test-combined-object-jsdoc-name
   * @example
   * const name = testCombinedObjectJSDoc.name
   **/
  name: string
  /**
   * Specifies the price of the product
   * @tag test-combined-object-jsdoc-price
   * @example
   * const price = testCombinedObjectJSDoc.price
   **/
  price: number
  id: string // Added directly without inline comment for contrast
  isActive: boolean // Added directly without inline comment for contrast
} = {
  name: 'Example Product',
  price: 99.99,
  id: '12345',
  isActive: true,
}

const testObjectDestructuring = {
  /** The property that is being destructured. */
  destructuringProperty: 'John',
}

/**
 * Tests destructuring assignments where the object being destructured has its own JSDoc comments.
 * Verifies whether the comments are maintained or lost upon destructuring.
 */
export let { destructuringProperty } = testObjectDestructuring

type Product = {
  /** Documents a product's name within a type alias */
  name: string
  /** Documents a product's price within a type alias */
  price: number
}

/**
 * Tests referencing a type alias in an object declaration to verify that type aliases are resolved
 * and applied correctly in object contexts.
 * @tag test-case
 */
export const testProductTypeAlias: Product = {
  name: 'Example Product',
  price: 99.99,
}

/**
 * Tests defining and returning a custom object type using a function with a JSDoc `@returns` tag.
 * This case checks the correct application of typedefs in function return types.
 * @tag test-case
 * @returns {SimpleObject} Demonstrates returning a structured object with predefined typedef.
 */
export function testCreatingSimpleObject() {
  return {
    property: 'Example value',
  }
}

/**
 * Tests generic type parameter inference within a scoped function that declares a local generic type.
 * This tests the scope handling and type inference capabilities of generics in nested contexts.
 * @tag test-case
 */
export const testGenericTypeInference = <T>(value: T) => {
  return value
}

/**
 * Tests complex configuration objects with callbacks, focusing on inlined JSDoc comments for deeply
 *  nested object properties and functions. This ensures detailed documentation within nested structures is parsed and represented accurately.
 * @tag test-case
 */
export const testFunctionWithComplexParams = (
  config: {
    /** Key in the configuration object */
    key: string
    /** Value associated with the key */
    value: number
    /**
     * Callback function within the configuration object.
     * @param {{ name: string, age: number }} userInfo - User details.
     * @param {Settings} settings - User specific settings.
     */
    callback: (
      userInfo: {
        /** Name of the user */
        name: string
        /** Age of the user */
        age: number
      },
      settings: Settings,
    ) => void
  },
  settings: Settings,
) => {
  console.log(config, settings)
}

/**
 * Test the declaration and implementation of a function using traditional syntax, focusing on parameter
 * handling and JSDoc integration within a conventional function declaration.
 * @tag test-case-traditional-function-syntax
 */
export function testTraditionalFunctionSyntax(
  /** Inlined jsdoc comment for config */
  config: {
    /** Inlined jsdoc comment for key */
    key: string
    /** Inlined jsdoc comment for value */
    value: number
  },
  settings: Settings,
) {
  console.log(config, settings)
}

/**
 * Tests the documentation of settings using a type alias, emphasizing the detailed property JSDoc within
 * a type structure to ensure types are not only parsed correctly but also thoroughly documented.
 * @tag test-case
 */
export type Settings = {
  /** Theme setting of the application */
  theme: string
  /** Layout setting of the application */
  layout: string
}

/**
 * Tests class declaration capabilities with private and public properties, constructor parameters,
 * and method annotations. This test verifies that access modifiers and privacy settings are respected
 * and documented accurately.
 * @tag test-case
 */
export class TestClassWithPropertiesAndMethods {
  /** Publicly accessible first name of the user */
  public firstName: string = 'John'

  /** Privately held last name of the user */
  #lastName: string = 'Doe'

  /**
   * Constructor that initializes user details.
   */
  constructor() {
    console.log('User initialized:', this.firstName, this.#lastName)
  }

  /**
   * Method that greets the user, demonstrating return type documentation.
   */
  greet() {
    return `Hello, ${this.firstName} ${this.#lastName}!`
  }

  /**
   * A private method demonstrating privacy within classes.
   * This method logs a private message.
   */
  private logDetails() {
    console.log(`Details: ${this.firstName}, ${this.#lastName}`)
  }

  /**
   * A protected method showing how protected members are handled.
   * This method returns the details in a formatted string.
   */
  protected getDetails() {
    return `${this.firstName} ${this.#lastName}`
  }
}

/**
 * Abstract class to demonstrate inheritance and method overriding.
 * @tag test-case
 */
abstract class AbstractUser {
  /** The name of the user */
  public name: string

  constructor(name: string) {
    this.name = name
  }

  /**
   * Abstract method to be implemented by subclasses. Must return a greeting message.
   */
  abstract greet(): string

  /**
   * A public method accessible to instances of subclasses.
   * This method returns the name of the user.
   */
  public getName() {
    return this.name
  }
}

/**
 * Concrete class extending an abstract class, implementing the required abstract method.
 */
export class ConcreteUser extends AbstractUser {
  constructor(name: string) {
    super(name)
  }

  /**
   * Implementation of the abstract greet method.
   */
  greet() {
    return `Hello, ${this.name}!`
  }
}

/**
 * Tests the implementation and documentation of an enumeration with explicit values,
 * ensuring enums are not only declared but also their values are correctly set and utilized in
 * function parameters.
 * @tag test-case
 */
enum TestLogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export function testFunctionUsingEnum(level: TestLogLevel, message: string) {
  console.log(`[${level}]: ${message}`)
}
