import { createRequire } from "module"

import { ParserOptions, SupportLanguage } from "prettier"

const require = createRequire(import.meta.url)

// Helper function to check if a statement is a lexical declaration
function isLexicalDeclaration(node: any): boolean {
    return (
        (node?.type === "VariableDeclaration" && (node.kind === "const" || node.kind === "let")) ||
        node?.type === "FunctionDeclaration" ||
        node?.type === "ClassDeclaration"
    )
}

// Helper function to check if node contains comments
function hasComments(node: any): boolean {
    return !!(node?.leadingComments?.length || node?.trailingComments?.length || node?.innerComments?.length)
}

// Helper function to check if removing braces would cause dangling else issue
function wouldCauseDanglingElse(ifNode: any): boolean {
    if (!ifNode || ifNode.type !== "IfStatement") return false

    const consequent = ifNode.consequent
    if (!consequent || consequent.type !== "BlockStatement") return false

    // Check if the block contains only one if statement without else
    if (consequent.body.length === 1 && consequent.body[0].type === "IfStatement") {
        const innerIf = consequent.body[0]

        // If inner if has no else branch but outer if has else branch, removing braces would cause dangling else
        if (!innerIf.alternate && ifNode.alternate) return true
    }

    return false
}

// Main AST transformation function
function transformAST(ast: any): any {
    if (!ast || typeof ast !== "object") return ast

    // Handle ArrowFunctionExpression
    if (ast.type === "ArrowFunctionExpression" && ast.body?.type === "BlockStatement") {
        const block = ast.body

        // Check if block has only one statement and it's a return statement
        if (
            block.body.length === 1 &&
            block.body[0].type === "ReturnStatement" &&
            !hasComments(block.body[0]) && // Check comment on return statement
            !hasComments(block) &&
            !isLexicalDeclaration(block.body[0])
        ) {
            const returnStatement = block.body[0]
            let argument = returnStatement.argument

            // For object literals, we'll handle this differently by using sequence expression
            if (argument?.type === "ObjectExpression")
                return {
                    ...ast,
                    body: {
                        type: "SequenceExpression",
                        expressions: [argument],
                    },
                }

            return {
                ...ast,
                body: argument || { type: "Identifier", name: "undefined" },
            }
        }
    }

    // Handle IfStatement
    if (ast.type === "IfStatement") {
        const transformed = { ...ast }

        // Check consequent
        if (
            ast.consequent?.type === "BlockStatement" &&
            ast.consequent.body.length === 1 &&
            !hasComments(ast.consequent) &&
            !isLexicalDeclaration(ast.consequent.body[0]) &&
            !wouldCauseDanglingElse(ast)
        )
            transformed.consequent = ast.consequent.body[0]

        // Check alternate
        if (
            ast.alternate?.type === "BlockStatement" &&
            ast.alternate.body.length === 1 &&
            !hasComments(ast.alternate) &&
            !isLexicalDeclaration(ast.alternate.body[0])
        )
            transformed.alternate = ast.alternate.body[0]

        // Recursively transform nested if statements
        transformed.consequent = transformAST(transformed.consequent)
        transformed.alternate = transformAST(transformed.alternate)

        return transformed
    }

    // Handle loop statements (ForStatement, WhileStatement, DoWhileStatement, ForInStatement, ForOfStatement)
    const loopTypes = ["ForStatement", "WhileStatement", "DoWhileStatement", "ForInStatement", "ForOfStatement"]

    if (loopTypes.includes(ast.type) && ast.body?.type === "BlockStatement") {
        const block = ast.body

        if (block.body.length === 1 && !hasComments(block) && !isLexicalDeclaration(block.body[0]))
            return {
                ...ast,
                body: block.body[0],
            }
    }

    // Recursively transform all child nodes
    for (const key in ast)
        if (Array.isArray(ast[key])) ast[key] = ast[key].map(transformAST)
        else if (ast[key] && typeof ast[key] === "object" && key !== "loc" && key !== "range" && key !== "tokens") ast[key] = transformAST(ast[key])

    return ast
}

// Create the plugin
export const plugin = {
    languages: [
        {
            name: "typescript",
            parsers: ["typescript"],
        },
    ] as SupportLanguage[],
    parsers: {
        typescript: {
            ...require("prettier/plugins/typescript").parsers.typescript,
            parse(text: string, options: ParserOptions) {
                const originalParser = require("prettier/plugins/typescript").parsers.typescript
                const ast = originalParser.parse(text, options)

                // Always transform when this plugin is enabled
                return transformAST(ast)
            },
        },
    },
    printers: {
        "typescript-estree": {
            print: (path: any, options: any, print: any) => {
                const node = path.getValue()
                const originalPrinter = require("prettier/plugins/typescript").printers["typescript-estree"]

                // Handle sequence expressions that should be wrapped in parentheses
                if (node.type === "SequenceExpression" && node.expressions.length === 1) {
                    const expr = node.expressions[0]

                    if (expr.type === "ObjectExpression")
                        return `(${originalPrinter.print(path.call.apply(path, [print as any, "expressions", 0]), options, print)})`
                }

                // Use original printer for everything else
                return originalPrinter.print(path, options, print)
            },
        },
    },
}

export default plugin
