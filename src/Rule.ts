import { ControlValue } from './ControlValue';
import { Range } from './Range';

export class Rule {

  public name: string = '';
  public triggerPath: string = '';
  public lowThreshold: number = 0;
  public highThreshold: number = 0;
  public controlPath: string = '';
  public inRangeControlValue: ControlValue = ControlValue.undefined;
  public lowTransitControlValue: ControlValue = ControlValue.undefined;
  public highTransitControlValue: ControlValue = ControlValue.undefined;
  public lastControlValue: ControlValue = ControlValue.undefined;

  constructor(options: any) {
    if (!options.triggerPath) throw new Error('missing \'triggerPath\' property');
    if (!options.lowThreshold) throw new Error('missing \'lowThreshold\' property');
    if (!options.highThreshold) throw new Error('missing \'highThreshold\' property');

    this.name = options.name || 'innominate';
    this.triggerPath = options.triggerPath;
    this.controlPath = options.controlPath || `notifications.${options.triggerPath}`;
    this.lowThreshold = options.lowThreshold;
    this.highThreshold = options.highThreshold;
    this.inRangeControlValue = (options.inRangeControlValue)?new ControlValue(options.inRangeControlValue):ControlValue.undefined,
    this.lowTransitControlValue = (options.lowTransitControlValue)?new ControlValue(options.lowTransitControlValue):ControlValue.undefined,
    this.highTransitControlValue = (options.highTransitControlValue)?new ControlValue(options.highTransitControlValue):ControlValue.undefined,
    this.lastControlValue = ControlValue.undefined
  }

  getControlValue(range: Range): ControlValue {
    switch (range) {
      case Range.inrange: return(this.inRangeControlValue);
      case Range.low: return(this.lowTransitControlValue);
      case Range.high: return(this.highTransitControlValue);
    }
    return(ControlValue.undefined);
  }

}
