// Example file to demonstrate prettier-plugin-remove-braces
// Run: npx prettier --write example.js

// Arrow functions - braces will be removed
const add = (a, b) => {
    return a + b
}

const multiply = (x, y) => {
    return x * y
}

// Arrow function with object literal - will be wrapped in parentheses
const getUser = () => {
    return { name: "John", age: 30 }
}

// Arrow function with undefined return - will be simplified
const doNothing = () => {
    return
}

// If statements - braces will be removed
if (true) {
    console.log("Hello")
}

if (condition) {
    doSomething()
} else {
    doSomethingElse()
}

// Loops - braces will be removed
for (let i = 0; i < 5; i++) {
    console.log(i)
}

while (flag) {
    process()
}

do {
    break
} while (false)

for (const item of items) {
    handle(item)
}

// Cases where braces will be preserved:
if (shouldRun) {
    // Multiple statements
    prepare()

    execute()
}

if (config) {
    // Lexical declaration
    const value = config.value
}

if (outer) {
    // Dangling else prevention
    if (inner) {
        doInner()
    }
} else {
    doOuter()
}

// Function and class declarations in blocks preserve braces
if (shouldDefine) {
    function helper() {}
}

if (shouldCreate) {
    class Example {}
}
