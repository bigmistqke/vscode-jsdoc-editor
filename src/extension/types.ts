export interface Parameter {
  name: string
  typeAnnotation?: TypeAnnotation
  jsdoc?: JSDocInfo
}

export interface GenericDeclaration {
  name: string
  extends?: string
  defaultValue?: string
}

/**********************************************************************************/
/*                                                                                */
/*                                 Type Elements                                  */
/*                                                                                */
/**********************************************************************************/

export interface TypeElementBase {
  kind: string
  name: string
  jsdoc?: JSDocInfo
}

export interface VariableElement extends TypeElementBase {
  kind: 'Variable'
  literal?: string
  typeAnnotation?: TypeAnnotation
}

export interface FunctionElement extends TypeElementBase {
  kind: 'Function'
  parameters: readonly Parameter[]
  returnType: TypeAnnotation | undefined
  generics?: GenericDeclaration[]
}

export interface ClassElement extends TypeElementBase {
  kind: 'Class'
  isAbstract: boolean
  extends?: string
  members: readonly ClassMember[]
  generics?: GenericDeclaration[]
}

export interface EnumElement extends TypeElementBase {
  kind: 'Enum'
  members: readonly EnumMember[]
}

export interface TypeAliasElement extends TypeElementBase {
  kind: 'TypeAlias'
  typeAnnotation?: TypeAnnotation
  generics?: GenericDeclaration[]
  literal: string
}

export type TypeElement = VariableElement | FunctionElement | ClassElement | EnumElement | TypeAliasElement

/**********************************************************************************/
/*                                                                                */
/*                                   Type Member                                  */
/*                                                                                */
/**********************************************************************************/

export interface TypeMemberBase {
  typeAnnotation?: TypeAnnotation
  jsdoc?: JSDocInfo
}

export interface EnumMember extends TypeMemberBase {
  name: string
  value?: string | number
}

interface ClassMemberBase extends TypeMemberBase {
  name?: string
  accessModifier?: string
  generics?: GenericDeclaration[]
}
export interface ClassPropertyMember extends ClassMemberBase {
  kind: 'Property'
}
export interface ClassMethodMember extends ClassMemberBase {
  kind: 'Method' | 'Constructor'
  parameters?: Parameter[]
}
export type ClassMember = ClassPropertyMember | ClassMethodMember

/**********************************************************************************/
/*                                                                                */
/*                                Type Annotation                                 */
/*                                                                                */
/**********************************************************************************/

interface AnnotationBase {
  literal: string
}

export interface PrimitiveTypeAnnotation {
  kind: 'PrimitiveType'
  literal: string
  generics?: GenericDeclaration[]
}

interface TypeReferenceAnnotation {
  kind: 'TypeReference'
  name: string
  parameters?: TypeAnnotation[]
}

export interface TypeLiteralAnnotation extends AnnotationBase {
  kind: 'TypeLiteral'
  members: readonly TypeLiteralMember[]
  generics?: GenericDeclaration[]
  literal: string
}
export interface TypeLiteralMember extends TypeMemberBase {
  name: string
}

export interface IntersectionAnnotation extends AnnotationBase {
  kind: 'Intersection'
  types: readonly TypeAnnotation[]
}

export interface UnionAnnotation extends AnnotationBase {
  kind: 'Union'
  types: readonly TypeAnnotation[]
}

export interface TupleAnnotation extends AnnotationBase {
  kind: 'Tuple'
  types: TypeAnnotation[]
}

export interface FunctionTypeAnnotation extends AnnotationBase {
  kind: 'FunctionType'
  generics?: GenericDeclaration[]
  parameters: readonly Parameter[]
  returnType: TypeAnnotation | undefined
}

export type TypeAnnotation =
  | PrimitiveTypeAnnotation
  | TypeReferenceAnnotation
  | TypeLiteralAnnotation
  | IntersectionAnnotation
  | UnionAnnotation
  | TupleAnnotation
  | FunctionTypeAnnotation

/**********************************************************************************/
/*                                                                                */
/*                                     Js Doc                                     */
/*                                                                                */
/**********************************************************************************/

export interface JSDocInfo {
  description?: readonly string[]
  tags?: readonly JSDocTag[]
}

export interface JSDocTag {
  // tagName: string
  comment?: string
  name?: string
  literal?: string
}
