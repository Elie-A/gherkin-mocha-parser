import { BackgroundModel } from './backgroundModel';
import { ScenarioModel } from './scenarioModel';
import { ScenarioOutlineModel } from './scenarioOutlineModel';

export class FeatureModel {
  name: string = '';
  description: string[] = [];
  background?: BackgroundModel;
  scenarios: (ScenarioModel | ScenarioOutlineModel)[] = [];
}
