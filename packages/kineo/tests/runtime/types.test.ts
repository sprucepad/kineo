import { describe, it, expectTypeOf } from "vitest";
import type { InferModel } from "@/schema";
import { model } from "@/schema";
import { kineo } from "./client";
import type {
  CreateData,
  UpdateData,
  WhereInput,
  FindOpts,
  CreateOpts,
  UpdateOpts,
  DeleteOpts,
  CountOpts,
  AggregateOpts,
  GroupByOpts,
  ApplySelection,
  FieldUpdate,
} from "./types";

// Mock adapter for type testing
const mockAdapter = {
  async exec() {
    return { rows: [], rowCount: 0 };
  },
  async close() {},
  async emit() {
    return { command: "", params: [] };
  },
};

// Create test schemas
const User = model("User", (s) => ({
  id: s.int().id(),
  name: s.string().required(),
  email: s.string().required(),
  age: s.int().optional(),
  isActive: s.boolean().default(true),
  createdAt: s.datetime().default(new Date()),
  metadata: s.json().optional(),
}));

const Post = model("Post", (s) => ({
  id: s.int().id(),
  title: s.string().required(),
  content: s.string().optional(),
  published: s.boolean().default(false),
  authorId: s.int().required(),
  tags: s.string().many(),
  viewCount: s.int().default(0),
})).relate((s) => ({
  author: s.relation(User).fields("authorId").refs("id"),
}));

const Comment = model("Comment", (s) => ({
  id: s.int().id(),
  text: s.string().required(),
  postId: s.int().required(),
  userId: s.int().required(),
  rating: s.float().optional(),
})).relate((s) => ({
  post: s.relation(Post).fields("postId").refs("id"),
  user: s.relation(User).fields("userId").refs("id"),
}));

const schema = { User, Post, Comment };
// eslint-disable-next-line -- it's easier to create a client than to do `Kineo<typeof Schema>`
const client = kineo(mockAdapter, schema);

type UserModel = InferModel<typeof User>;
type UserInput = InferModel<typeof User, true>;
type PostInput = InferModel<typeof Post, true>;

describe("Type Tests - Model Inference", () => {
  it("infers correct model types", () => {
    expectTypeOf<(typeof client.User)["$name"]>().toBeString();
    expectTypeOf<(typeof client.User)["$schema"]>().toBeObject();
    expectTypeOf<(typeof client.User)["$adapter"]>().toBeObject();

    expectTypeOf<(typeof client.Post)["$name"]>().toBeString();
    expectTypeOf<(typeof client.Post)["$schema"]>().toBeObject();
    expectTypeOf<(typeof client.Post)["$adapter"]>().toBeObject();

    expectTypeOf<(typeof client.Comment)["$name"]>().toBeString();
    expectTypeOf<(typeof client.Comment)["$schema"]>().toBeObject();
    expectTypeOf<(typeof client.Comment)["$adapter"]>().toBeObject();
  });
});

describe("Type Tests - CreateData", () => {
  it("infers correct CreateData types for User", () => {
    type UserCreateData = CreateData<UserInput>;

    expectTypeOf<UserCreateData["name"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<UserCreateData["email"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<UserCreateData["id"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<UserCreateData["age"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<UserCreateData["isActive"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<UserCreateData["createdAt"]>().toEqualTypeOf<
      Date | undefined
    >();
    expectTypeOf<UserCreateData["metadata"]>().toEqualTypeOf<any | undefined>();
  });

  it("infers correct CreateData types for Post", () => {
    type PostCreateData = CreateData<PostInput>;

    expectTypeOf<PostCreateData["title"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<PostCreateData["authorId"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<PostCreateData["published"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<PostCreateData["viewCount"]>().toEqualTypeOf<
      number | undefined
    >();
  });
});

describe("Type Tests - UpdateData", () => {
  it("infers correct UpdateData types", () => {
    type UserUpdateData = UpdateData<UserInput>;

    expectTypeOf<UserUpdateData["name"]>().toEqualTypeOf<
      FieldUpdate<string> | undefined
    >();
    expectTypeOf<UserUpdateData["email"]>().toEqualTypeOf<
      FieldUpdate<string> | undefined
    >();
    expectTypeOf<UserUpdateData["id"]>().toEqualTypeOf<
      FieldUpdate<number> | undefined
    >();
    expectTypeOf<UserUpdateData["age"]>().toEqualTypeOf<
      FieldUpdate<number> | undefined
    >();
  });
});

describe("Type Tests - WhereInput", () => {
  it("infers correct WhereInput types", () => {
    type UserWhereInput = WhereInput<UserModel>;

    expectTypeOf<UserWhereInput>().toHaveProperty("name");
    expectTypeOf<UserWhereInput>().toHaveProperty("age");
    expectTypeOf<UserWhereInput>().toHaveProperty("isActive");
    expectTypeOf<UserWhereInput>().toHaveProperty("AND");
    expectTypeOf<UserWhereInput>().toHaveProperty("OR");
  });

  it("allows nested filters inside not clauses", () => {
    type UsernameFilter = WhereInput<{ username: string }>;

    const filter: UsernameFilter = {
      username: {
        startsWith: "ann",
        not: {
          endsWith: "e",
        },
      },
    };

    expectTypeOf(filter.username).toMatchTypeOf<UsernameFilter["username"]>();
  });
});

describe("Type Tests - Selection / Include", () => {
  it("excludes non-included relations when using include", () => {
    type NestedModel = {
      posts: {
        id: number;
        title: string;
        author: {
          id: number;
          name: string;
        };
      }[];
    };

    type Selected = ApplySelection<
      NestedModel,
      {
        include: {
          posts: {
            select: {
              id: true;
            };
          };
        };
      }
    >;

    expectTypeOf<Selected["posts"][number]["id"]>().toEqualTypeOf<number>();
    // @ts-expect-error Missing non-included relation field should not exist
    const missingAuthor: Selected["posts"][number]["author"] = undefined as any;
    void missingAuthor;
  });
});

describe("Type Tests - Method Options", () => {
  it("infers correct FindOpts types", () => {
    type UserFindOpts = FindOpts<UserModel, UserInput>;

    expectTypeOf<UserFindOpts>().toHaveProperty("where");
    expectTypeOf<UserFindOpts>().toHaveProperty("select");
    expectTypeOf<UserFindOpts>().toHaveProperty("include");
    expectTypeOf<UserFindOpts["rejectOnNotFound"]>().toEqualTypeOf<
      boolean | undefined
    >();
  });

  it("infers correct CreateOpts types", () => {
    type UserCreateOpts = CreateOpts<UserModel, UserInput>;

    expectTypeOf<UserCreateOpts["data"]>().toEqualTypeOf<
      CreateData<UserInput>
    >();
    expectTypeOf<UserCreateOpts>().toHaveProperty("include");
    expectTypeOf<UserCreateOpts>().toHaveProperty("select");
  });

  it("infers correct UpdateOpts types", () => {
    type UserUpdateOpts = UpdateOpts<UserModel, UserInput>;

    expectTypeOf<UserUpdateOpts["where"]>().toEqualTypeOf<
      WhereInput<UserInput>
    >();
    expectTypeOf<UserUpdateOpts["data"]>().toEqualTypeOf<
      UpdateData<UserInput>
    >();
    expectTypeOf<UserUpdateOpts>().toHaveProperty("include");
    expectTypeOf<UserUpdateOpts>().toHaveProperty("select");
  });

  it("infers correct DeleteOpts types", () => {
    type UserDeleteOpts = DeleteOpts<UserModel, UserInput>;

    expectTypeOf<UserDeleteOpts["where"]>().toEqualTypeOf<
      WhereInput<UserInput>
    >();
    expectTypeOf<UserDeleteOpts>().toHaveProperty("include");
    expectTypeOf<UserDeleteOpts>().toHaveProperty("select");
  });

  it("infers correct CountOpts types", () => {
    type UserCountOpts = CountOpts<UserInput>;

    expectTypeOf<UserCountOpts["where"]>().toEqualTypeOf<
      WhereInput<UserInput> | undefined
    >();
    expectTypeOf<UserCountOpts["take"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<UserCountOpts["skip"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<UserCountOpts["cursor"]>().toEqualTypeOf<
      Partial<UserInput> | undefined
    >();
  });

  it("infers correct AggregateOpts types", () => {
    type UserAggregateOpts = AggregateOpts<UserModel, UserInput>;

    expectTypeOf<UserAggregateOpts["where"]>().toEqualTypeOf<
      WhereInput<UserInput> | undefined
    >();
    expectTypeOf<UserAggregateOpts["_count"]>().toEqualTypeOf<
      // eslint-disable-next-line -- it's what the type is
      boolean | { select?: Partial<{}> } | undefined
    >();
    expectTypeOf<UserAggregateOpts["_min"]>().toEqualTypeOf<
      | {
          select?:
            | Partial<{
                id: true;
                createdAt: true;
                age?: true | undefined;
              }>
            | undefined;
        }
      | undefined
    >();
  });

  it("infers correct GroupByOpts types", () => {
    type UserGroupByOpts = GroupByOpts<UserModel, UserInput>;

    expectTypeOf<UserGroupByOpts["by"]>().toEqualTypeOf<(keyof UserModel)[]>();
    expectTypeOf<UserGroupByOpts["where"]>().toEqualTypeOf<
      WhereInput<UserInput> | undefined
    >();
    expectTypeOf<UserGroupByOpts["take"]>().toEqualTypeOf<number | undefined>();
  });
});

describe("Type Tests - Kineo Client", () => {
  it("infers correct client types", () => {
    expectTypeOf<(typeof client)["User"]>().toBeObject();
    expectTypeOf<(typeof client)["Post"]>().toBeObject();
    expectTypeOf<(typeof client)["Comment"]>().toBeObject();

    expectTypeOf<(typeof client)["$adapter"]>().toBeObject();
    expectTypeOf<(typeof client)["$exec"]>().toBeFunction();
    expectTypeOf<(typeof client)["$close"]>().toBeFunction();
  });
});
