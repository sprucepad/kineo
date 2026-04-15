import db from "./db/client.js";

export async function queryExample() {
  return await db.user.findMany({
    where: {
      username: {
        startsWith: "ann",
        not: { endsWith: "e" },
      },
      posts: {
        some: {
          published: true,
        },
      },
      AND: [
        {
          posts: {
            some: {
              categories: {
                some: {
                  name: {
                    in: ["Tech", "AI"],
                  },
                },
              },
            },
          },
        },
        {
          posts: {
            // ensures at least 2 posts
            some: {},
          },
        },
      ],
    },

    include: {
      posts: {
        where: {
          published: true,
        },
        orderBy: {
          views: "desc",
        },
        take: 3,
        include: {
          categories: {
            where: {
              name: {
                notIn: ["Spam"],
              },
            },
          },
        },
      },
      _count: {
        select: {
          posts: true,
        },
      },
    },

    orderBy: {
      posts: {
        _count: "desc",
      },
    },
  });
}

export async function upsertExample() {
  return await db.user.upsert({
    where: {
      email: "dev@example.com",
    },

    update: {
      posts: {
        // update many existing posts
        updateMany: {
          where: {
            published: false,
            views: {
              lt: 50,
            },
          },
          data: {
            published: true,
          },
        },

        // increment views on popular posts
        update: [
          {
            where: { id: "post_1" },
            data: {
              views: {
                increment: 10,
              },
            },
          },
        ],
      },
    },

    create: {
      email: "dev@example.com",
      username: "devuser",
      password: "password123",
    },

    include: {
      posts: {
        include: {
          categories: true,
        },
      },
    },
  });
}

export async function updateExample() {
  return await db.post.update({
    where: {
      id: "post_123",
    },

    data: {
      title: "Refactored Title",

      author: {
        connect: {
          email: "newauthor@example.com",
        },
      },

      categories: {
        set: [{ name: "Tech" }],
        connect: [{ name: "AI" }],
        disconnect: [{ name: "OldCategory" }],
        create: [{ name: "NewCategory" }],
      },

      views: {
        increment: 1,
      },
    },

    include: {
      author: true,
      categories: true,
    },
  });
}
