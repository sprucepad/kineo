import type { AsyncRuntimeAdapter, RuntimeAdapter } from "@/adapter";
import type {
  InferModel,
  ModelBuilder,
  ModelProps,
  ModelRelations,
  ParsedModel,
  ParsedSchema,
} from "@/schema";

export class Model<
  Props extends ModelProps,
  Relations extends ModelRelations,
  Inferred = InferModel<ModelBuilder<Props, () => Relations>>,
  InferredOptionalDefault = InferModel<
    ModelBuilder<Props, () => Relations>,
    true
  >,
> {
  public $shape: ParsedModel;
  constructor(
    public $schema: ParsedSchema,
    public $name: string,
    public $adapter: RuntimeAdapter | AsyncRuntimeAdapter,
  ) {
    this.$shape =
      $schema.models.get($name) ??
      (() => {
        throw new Error(
          "Name passed into runtime `Model` constructor does not exist within schema",
        );
      })();
  }

  // TODO
}
