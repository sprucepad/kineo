import { describe, it, expectTypeOf } from "vitest";
import type { InferProps, InferRelations } from "@/schema";
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
import type { BuilderProps, BuilderRelations } from ".";

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

type UserProps = InferProps<BuilderProps<typeof User>>;
type UserPropsOpt = InferProps<BuilderProps<typeof User>, true>;
type UserRels = InferRelations<BuilderRelations<typeof User>>;
type UserRelsOpt = InferRelations<BuilderRelations<typeof User>, true>;
type PostPropsOpt = InferProps<BuilderProps<typeof Post>, true>;
type PostRelsOpt = InferRelations<BuilderRelations<typeof Post>, true>;

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
    type UserCreateData = CreateData<UserPropsOpt>;

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
    type PostCreateData = CreateData<PostPropsOpt & PostRelsOpt>;

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
    type UserUpdateData = UpdateData<UserPropsOpt>;

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
    type UserWhereInput = WhereInput<UserProps>;

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
    // Should not have other fields when explicitly selecting
    expectTypeOf<Selected["posts"][number]>().toMatchTypeOf<{ id: number }>();
  });
});

describe("Type Tests - Method Options", () => {
  it("infers correct FindOpts types", () => {
    type UserFindOpts = FindOpts<
      UserProps,
      UserPropsOpt,
      UserRels,
      UserRelsOpt
    >;

    expectTypeOf<UserFindOpts>().toHaveProperty("where");
    expectTypeOf<UserFindOpts>().toHaveProperty("select");
    expectTypeOf<UserFindOpts>().toHaveProperty("include");
    expectTypeOf<UserFindOpts["rejectOnNotFound"]>().toEqualTypeOf<
      boolean | undefined
    >();
  });

  it("infers correct CreateOpts types", () => {
    type UserCreateOpts = CreateOpts<
      UserProps,
      UserPropsOpt,
      UserRels,
      UserRelsOpt
    >;

    expectTypeOf<UserCreateOpts["data"]>().toEqualTypeOf<
      CreateData<UserPropsOpt & UserRelsOpt>
    >();
    expectTypeOf<UserCreateOpts>().toHaveProperty("include");
    expectTypeOf<UserCreateOpts>().toHaveProperty("select");
  });

  it("infers correct UpdateOpts types", () => {
    type UserUpdateOpts = UpdateOpts<
      UserProps,
      UserPropsOpt,
      UserRels,
      UserRelsOpt
    >;

    expectTypeOf<UserUpdateOpts["where"]>().toEqualTypeOf<
      WhereInput<UserPropsOpt & UserRelsOpt>
    >();
    expectTypeOf<UserUpdateOpts["data"]>().toEqualTypeOf<
      UpdateData<UserPropsOpt & UserRelsOpt>
    >();
    expectTypeOf<UserUpdateOpts>().toHaveProperty("include");
    expectTypeOf<UserUpdateOpts>().toHaveProperty("select");
  });

  it("infers correct DeleteOpts types", () => {
    type UserDeleteOpts = DeleteOpts<
      UserProps,
      UserPropsOpt,
      UserRels,
      UserRelsOpt
    >;

    expectTypeOf<UserDeleteOpts["where"]>().toEqualTypeOf<
      WhereInput<UserPropsOpt & UserRelsOpt>
    >();
    expectTypeOf<UserDeleteOpts>().toHaveProperty("include");
    expectTypeOf<UserDeleteOpts>().toHaveProperty("select");
  });

  it("infers correct CountOpts types", () => {
    type UserCountOpts = CountOpts<
      UserProps,
      UserPropsOpt,
      UserRels,
      UserRelsOpt
    >;

    expectTypeOf<UserCountOpts["where"]>().toEqualTypeOf<
      WhereInput<UserPropsOpt & UserRelsOpt> | undefined
    >();
    expectTypeOf<UserCountOpts["take"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<UserCountOpts["skip"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<UserCountOpts["cursor"]>().toEqualTypeOf<
      Partial<UserPropsOpt> | undefined
    >();
  });

  it("infers correct AggregateOpts types", () => {
    type UserAggregateOpts = AggregateOpts<
      UserProps,
      UserPropsOpt,
      UserRels,
      UserRelsOpt
    >;

    expectTypeOf<UserAggregateOpts["where"]>().toEqualTypeOf<
      WhereInput<UserPropsOpt & UserRelsOpt> | undefined
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
    type UserGroupByOpts = GroupByOpts<
      UserProps,
      UserPropsOpt,
      UserRels,
      UserRelsOpt
    >;

    expectTypeOf<UserGroupByOpts["by"]>().toEqualTypeOf<(keyof UserProps)[]>();
    expectTypeOf<UserGroupByOpts["where"]>().toEqualTypeOf<
      WhereInput<UserPropsOpt & UserRelsOpt> | undefined
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
