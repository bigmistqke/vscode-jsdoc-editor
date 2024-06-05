/**
 * Tests the documentation of settings using a type alias, emphasizing the detailed property JSDoc within
 * a type structure to ensure types are not only parsed correctly but also thoroughly documented.
 * @tag test-case
 */
export type Settings = {
  /** Theme setting of the application */
  theme: string
  /** Layout-setting of the application */
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
 * Abstract class 2 demonstrate inheritance and method overriding.
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
  /** Error */
  ERROR = 0,
  /** Warning */
  WARN = 1,
  /** Info */
  INFO = 2,
  /** Debug */
  DEBUG = 3,
}

export function testFunctionUsingEnum(level: TestLogLevel, message: string) {
  console.log(`[${level}]: ${message}`)
}
