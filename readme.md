# Gherkin to Mocha Test Generator

This project provides a TypeScript-based utility for parsing Gherkin feature files and generating Mocha test suites. It supports parsing of Gherkin syntax (e.g., Feature, Background, Scenario, Scenario Outline, and Examples) and converts them into executable Mocha test cases using the Mocha testing framework and Chai assertions.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Code Structure](#code-structure)
- [Example](#example)
- [Supported Gherkin Syntax](#supported-gherkin-syntax)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Parses Gherkin `.feature` files into a structured TypeScript model.
- Supports `Feature`, `Background`, `Scenario`, `Scenario Outline`, `Examples`, and tags.
- Extracts variables from steps (strings in quotes and numbers).
- Generates Mocha test suites with Chai assertions.
- Handles Gherkin tables for Examples in Scenario Outline.
- Supports doc strings (`""" ... """`) in steps.
- Easy-to-extend TypeScript models for Gherkin components.

---

## Installation

**Prerequisites:**

- Node.js (v14 or higher)
- TypeScript:  
  `npm install -g typescript`
  `npm install mocha`
  `npm install chai`

**Clone The Repository:**

`git clone https://github.com/Elie-A/gherkin-mocha-parser`
`cd gherkin-mocha-parser`

**Install dependencies:**
`npm install`

**Compile Typscript**
`tsc`

## Usage

**1. Prepare a Gherkin Feature File:**

- Create a `.feature` file in the Gherkin format (e.g., example.feature). See the Example (#example) section for a sample.

**2. Parse the Feature File:**

- Use the `parseFeature` function to parse the .feature file into a FeatureModel:

```ts
import { parseFeature, generateMochaTests, logFeature } from 'gherkin-mocha-parser';

const feature = parseFeature('path/to/example.feature');
console.log(feature); // View the parsed feature model
```

**3. Generate Mocha Tests:**
Use the `generateMochaTests` function to convert the parsed feature into a Mocha test suite:

```ts
const mochaTests = generateMochaTests(feature);
fs.writeFileSync('test.spec.js', mochaTests); // Save the generated test file
```

**Log the Parsed Feature (Optional):**

- Use the `logFeature` function to inspect the parsed feature model:

```ts
logFeature(feature);
```

## Code Structure

The codebase is organized into models and parsing logic:

### Models

- `BackgroundModel`: Represents a Gherkin Background with a list of steps.

```ts
export class BackgroundModel {
  steps: string[] = [];
}
```

- `ScenarioModel`: Represents a Gherkin Scenario with a name, steps, and tags.

```ts
export class ScenarioModel {
  name: string = '';
  steps: string[] = [];
  tags: string[] = [];
}
```

- `ScenarioOutlineModel`: Represents a Gherkin Scenario Outline with a name, steps, tags, and examples (table data).

```ts
export class ScenarioOutlineModel {
  name: string = '';
  steps: string[] = [];
  examples: Record<string, string>[] = [];
  tags: string[] = [];
}
```

- `FeatureModel`: Represents a Gherkin Feature with a name, description, optional background, and a list of scenarios (either ScenarioModel or ScenarioOutlineModel).

```ts
export class FeatureModel {
  name: string = '';
  description: string[] = [];
  background?: BackgroundModel;
  scenarios: (ScenarioModel | ScenarioOutlineModel)[] = [];
}
```

### Parsing Logic

- `parseFeature(filePath: string): FeatureModel`: Reads a Gherkin feature file and parses it into a FeatureModel. It handles:
  - Feature names and descriptions
  - Background steps
  - Scenarios and Scenario Outlines
  - Tags (e.g., @tag1 @tag2)
  - Example tables for Scenario Outlines
  - Doc strings (""" ... """)
- `generateMochaTests(feature: FeatureModel): string`: Converts a FeatureModel into a Mocha test suite string. It:

  - Generates a describe block for the feature
  - Creates it blocks for the background and each scenario
  - Extracts variables (strings and numbers) from steps
  - Includes example data for Scenario Outlines

- `logFeature(feature: object):` Logs the parsed FeatureModel to the console for debugging.

### Helpers Functions:

- `isStepLine(line: string): boolean`: Checks if a line starts with a Gherkin step keyword (Given, When, Then, And, But).
- `parseTableRow(line: string): string[]`: Parses a Gherkin table row (e.g., | column1 | column2 |) into an array.
- `extractVariablesFromStep(step: string)`: Record<string, any>: Extracts quoted strings and numbers from a step for use in tests.

## Example

### Input Feature File (example.feature)

```gherkin
Feature: User Login
  As a user
  I want to log in
  So I can access my account

  Background:
    Given the login page is open

  @smoke
  Scenario: Successful Login
    Given a user with username "john_doe" and password "secret123"
    When the user submits the login form
    Then the user is redirected to the dashboard

  @regression
  Scenario Outline: Login with Invalid Credentials
    Given a user with username "<username>" and password "<password>"
    When the user submits the login form
    Then an error message is displayed

    Examples:
      | username   | password  |
      | john_doe   | wrong     |
      | jane_doe   | invalid   |
```

### Generated Mocha Test

```js
const { mocha } = require('mocha');
const { expect } = require('chai');

describe('Feature: User Login', function () {
  it('Background: Given the login page is open', async () => {
    // Given the login page is open
    const data = {};
  });

  it('Successful Login', async () => {
    // Given a user with username "john_doe" and password "secret123"
    // When the user submits the login form
    // Then the user is redirected to the dashboard
    const data = {
      key1: 'john_doe',
      key2: 'secret123',
    };
  });

  it('Scenario Outline: Login with Invalid Credentials', async () => {
    // Given a user with username "<username>" and password "<password>"
    // When the user submits the login form
    // Then an error message is displayed
    const data = [
      {
        username: 'john_doe',
        password: 'wrong',
      },
      {
        username: 'jane_doe',
        password: 'invalid',
      },
    ];
  });
});
```

### Running The Example:

- Save the feature file as `example.feature`
- Run the parser:

**Running through the library:**

- Install the library: `npm install gherkin-mocha-parser`

```ts
import { parseFeature, generateMochaTests } from 'gherkin-mocha-parser';
import fs from 'fs';

const feature = parseFeature('example.feature');
const tests = generateMochaTests(feature);
fs.writeFileSync('test.spec.js', tests);
```

**Running through the project**

```ts
import { parseFeature, generateMochaTests } from './src/index'; // Change the path according to your tests' location
import fs from 'fs';

const feature = parseFeature('example.feature');
const tests = generateMochaTests(feature);
fs.writeFileSync('test.spec.js', tests);
```

## Supported Gherkin Syntax

- **Feature:** Title and description lines
- **Background:** Steps applied to all scenarios
- **Scenario:** Named scenarios with steps and tags
- **Scenario Outline:** Scenarios with placeholders and example tables
- **Examples:** Table data for Scenario Outlines
- **Tags:** @tag syntax for scenarios
- **Steps:** Given, When, Then, And, But
- **Doc Strings:** Multi-line strings enclosed in """ ... """
- **Tables:** Data tables for Examples sections
- **Rule:** Parsed as part of the feature description

## Limitations

- The generated Mocha tests are skeletons and require manual implementation of actual test logic (e.g., API calls or UI interactions).
- Variable extraction is limited to quoted strings and simple numbers; more complex patterns may need additional logic.
- No support for advanced Gherkin features like Examples with multiple tables or nested rules.
- The Rule keyword is treated as a description line rather than a distinct model.
- No built-in validation for Gherkin syntax errors in the feature file.

## Contributions

Contributions are welcome! To contribute:

- Fork the repository.
- Create a feature branch (git checkout -b feature/your-feature).
- Commit your changes (git commit -m 'Add your feature').
- Push to the branch (git push origin feature/your-feature).
- Open a pull request.
- Please include tests and update the README if necessary.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
