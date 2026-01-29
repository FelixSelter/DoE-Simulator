import { EvalFunction } from "mathjs";
import { z } from "zod";

export enum NoiseType {
  GaussianWhiteNoise = "Gaussian white noise",
  UniformWhiteNoise = "Uniform white noise",
}
export const NoiseTypeSchema = z.nativeEnum(NoiseType);

export enum DeviationType {
  Percentage = "Percentage",
  Absolute = "Absolute",
}
export const DeviationTypeSchema = z.nativeEnum(DeviationType);

const FactorSettingsSchema = z
  .object({
    name: z.string(),
    formulaSymbol: z.string(),
    isInteger: z.boolean(),
    minValue: z.number(),
    maxValue: z.number(),
    defaultValue: z.number(),
    numDecimalPlaces: z.int().nonnegative(),
    noiseType: NoiseTypeSchema,
    deviation: z.number().nonnegative(),
    deviationType: DeviationTypeSchema,
  })
  .refine(
    (data) =>
      data.minValue <= data.defaultValue && data.defaultValue <= data.maxValue,
    {
      message: "Violated: minValue <= defaultValue <= maxValue",
      path: ["minValue", "maxValue", "defaultValue"],
    },
  );
export type FactorSettings = z.infer<typeof FactorSettingsSchema>;

const TargetSettingsSchema = z.object({
  name: z.string(),
  formulaSymbol: z.string(),
  limits: z.array(z.number()), // Array of numbers
  numDecimalPlaces: z.int().nonnegative(),
});
export type TargetSettings = z.infer<typeof TargetSettingsSchema>;

const RetransformedTargetSettingsSchema = TargetSettingsSchema;
export type RetransformedTargetSettings = z.infer<
  typeof RetransformedTargetSettingsSchema
>;

const MeasurementSchema = z
  .object({
    Trial: z.number(),
    Rep: z.number(),
    key: z.string(),
  })
  .loose() // Allow additional properties
  .refine(
    //only numbers
    (obj) => {
      return Object.keys(obj).every(
        (key) =>
          ["Trial", "Rep", "key"].includes(key) || typeof obj[key] === "number",
      );
    },
    {
      message: "All additional properties must be numbers",
    },
  );
export type Measurement = z.infer<typeof MeasurementSchema>;

export const GlobalStateSchema = z.object({
  factors: z.array(FactorSettingsSchema),
  targets: z.array(TargetSettingsSchema),
  transformEquation: z.unknown(), // Allow any value for EvalFunction
  rawFactorInput: z.string(),
  costPerReplication: z.number(),
  maxBudget: z.number(),
  showFactorNoiseInMeasurements: z.boolean(),
  trialCounter: z.number(),
  spendMoney: z.number(),
  retransformedTargets: z.array(RetransformedTargetSettingsSchema),
  retransformEquation: z.unknown(), // Allow any value for EvalFunction
  rawRetransformInput: z.string(),
  measurements: z.array(MeasurementSchema),
  replicationsPerTrial: z.number().min(1),
  unlocked: z.boolean(),
  delay: z.number().nonnegative(),
  simulationFactorValues: z.object({ current: z.map(z.string(), z.number()) }),
  livePreview: z.boolean(),
  updatedFactors: z.number().int().nonnegative(),
  // Remember to update SaveDataSchema if you add more properties here
});

// Define the correct type for mathjs properties
export type GlobalState = Omit<
  z.infer<typeof GlobalStateSchema>,
  "transformEquation" | "retransformEquation"
> & {
  transformEquation: EvalFunction;
  retransformEquation: EvalFunction;
};

export const SaveDataSchema = GlobalStateSchema.omit({
  transformEquation: true,
  retransformEquation: true,
  measurements: true,
  trialCounter: true,
  spendMoney: true,
  unlocked: true,
  simulationFactorValues: true,
  delay: true,
  livePreview: true,
  updatedFactors: true,
});
export type SaveData = z.infer<typeof SaveDataSchema>;
