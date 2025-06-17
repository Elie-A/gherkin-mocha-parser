export class ScenarioOutlineModel {
  name: string = "";
  steps: string[] = [];
  examples: Record<string, string>[] = [];
  tags: string[] = [];
}
