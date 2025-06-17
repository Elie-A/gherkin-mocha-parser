import fs from 'fs';
import { BackgroundModel } from '../models/backgroundModel';
import { FeatureModel } from '../models/featureModel';
import { ScenarioModel } from '../models/scenarioModel';
import { ScenarioOutlineModel } from '../models/scenarioOutlineModel';

const STEP_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But'] as const;
type ParseMode = 'none' | 'background' | 'scenario' | 'outline' | 'rule';

function isStepLine(line: string): boolean {
  return STEP_KEYWORDS.some((keyword) => line.startsWith(keyword));
}

function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

type Context = {
  feature: FeatureModel;
  currentScenario: ScenarioModel | ScenarioOutlineModel | null;
  currentStepCollector: string[];
  mode: ParseMode;
  headers: string[];
  pendingTags: string[];
  inDocString: boolean;
};

export function parseFeature(filePath: string): FeatureModel {
  const lines = fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim());
  const ctx: Context = {
    feature: new FeatureModel(),
    currentScenario: null,
    currentStepCollector: [],
    mode: 'none',
    headers: [],
    pendingTags: [],
    inDocString: false,
  };

  const handlers: Record<string, (line: string, ctx: Context) => void> = {
    'Feature:': (line, ctx) => {
      ctx.feature.name = line.slice(8).trim();
    },
    'Background:': (_, ctx) => {
      const bg = new BackgroundModel();
      ctx.feature.background = bg;
      ctx.currentStepCollector = bg.steps;
      ctx.mode = 'background';
    },
    'Scenario Outline:': (line, ctx) => {
      const outline = new ScenarioOutlineModel();
      outline.name = line.slice(17).trim();
      outline.tags = ctx.pendingTags;
      ctx.pendingTags = [];
      ctx.feature.scenarios.push(outline);
      ctx.currentScenario = outline;
      ctx.currentStepCollector = outline.steps;
      ctx.mode = 'outline';
    },
    'Scenario:': (line, ctx) => {
      const scenario = new ScenarioModel();
      scenario.name = line.slice(9).trim();
      scenario.tags = ctx.pendingTags;
      ctx.pendingTags = [];
      ctx.feature.scenarios.push(scenario);
      ctx.currentScenario = scenario;
      ctx.currentStepCollector = scenario.steps;
      ctx.mode = 'scenario';
    },
    'Examples:': (_, ctx) => {
      ctx.headers = [];
    },
    'Rule:': (line, ctx) => {
      ctx.feature.description.push(`Rule: ${line.slice(5).trim()}`);
      ctx.mode = 'rule';
    },
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle doc strings (""" ... """)
    if (line.startsWith('"""')) {
      ctx.inDocString = !ctx.inDocString;
      ctx.currentStepCollector.push(line);
      continue;
    }

    if (ctx.inDocString) {
      ctx.currentStepCollector.push(line);
      continue;
    }

    if (line.startsWith('@')) {
      ctx.pendingTags = line.split(/\s+/).map((tag) => tag.trim());
      continue;
    }

    const matchedHandler = Object.keys(handlers).find((prefix) => line.startsWith(prefix));
    if (matchedHandler) {
      handlers[matchedHandler](line, ctx);
      continue;
    }

    if (line.startsWith('|')) {
      const cells = parseTableRow(line);
      if (ctx.headers.length === 0) {
        ctx.headers = cells;
      } else if (ctx.currentScenario instanceof ScenarioOutlineModel) {
        const row: Record<string, string> = {};
        ctx.headers.forEach((header, i) => {
          row[header] = cells[i] || '';
        });
        ctx.currentScenario.examples.push(row);
      }
      continue;
    }

    if (isStepLine(line)) {
      ctx.currentStepCollector.push(line);
      continue;
    }

    if (line && ctx.mode === 'none') {
      ctx.feature.description.push(line);
    }
  }

  return ctx.feature;
}

function extractVariablesFromStep(step: string): Record<string, any> {
  const variables: Record<string, any> = {};
  const quotedMatches = step.match(/"([^"]+)"/g);
  const numberMatches = step.match(/\b\d+(\.\d+)?\b/g);

  if (quotedMatches) {
    quotedMatches.forEach((match, index) => {
      variables[`key${index + 1}`] = match.replace(/"/g, '');
    });
  }

  if (numberMatches) {
    numberMatches.forEach((num, index) => {
      variables[`num${index + 1}`] = Number(num);
    });
  }

  return variables;
}

export function generateMochaTests(feature: FeatureModel): string {
  const lines: string[] = [];

  lines.push(`const { mocha } = require('mocha');`);
  lines.push(`const { expect } = require('chai');`);
  lines.push('');
  lines.push(`describe('Feature: ${feature.name}', function () {`);

  // Background
  if (feature.background && feature.background.steps.length > 0) {
    lines.push(`  it('Background: ${feature.background.steps[0]}', async () => {`);
    feature.background.steps.forEach((step) => lines.push(`    // ${step}`));

    const data = Object.assign(
      {},
      ...feature.background.steps.map((s) => extractVariablesFromStep(s)),
    );

    lines.push('');
    lines.push(`    const data = ${JSON.stringify(data, null, 6)};`);
    lines.push(`  });`);
    lines.push('');
  }

  for (const scenario of feature.scenarios) {
    const isOutline = scenario instanceof ScenarioOutlineModel;
    const title = isOutline ? `Scenario Outline: ${scenario.name}` : scenario.name;

    lines.push(`  it('${title}', async () => {`);
    scenario.steps.forEach((step) => lines.push(`    // ${step}`));
    lines.push('');

    if (isOutline) {
      const outline = scenario as ScenarioOutlineModel;
      const exampleData = outline.examples.map((example) => JSON.stringify(example, null, 6));
      lines.push(`    const data = [`);
      exampleData.forEach((row) => lines.push(`      ${row},`));
      lines.push(`    ];`);
    } else {
      const stepData = Object.assign(
        {},
        ...scenario.steps.map((step) => extractVariablesFromStep(step)),
      );
      lines.push(`    const data = ${JSON.stringify(stepData, null, 6)};`);
    }

    lines.push(`  });`);
    lines.push('');
  }

  lines.push(`});`);
  return lines.join('\n');
}
