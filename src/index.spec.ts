/* eslint-disable @typescript-eslint/no-explicit-any */
import { SecretsManager, STS, DynamoDB, HttpRequest, Endpoint } from "aws-sdk";
import { on } from "./index";

jest.mock("aws-sdk");

describe("aws-mock", () => {
  it("Should create resolve mock from type", async () => {
    const m = on(SecretsManager)
      .mock("getSecretValue")
      .resolve({ SecretString: "foo-bar" });

    const res = new SecretsManager({
      credentials: { accessKeyId: "rootkeyfoo" } as any,
    })
      .getSecretValue({ SecretId: "bar-baz" })
      .promise();

    await expect(res).resolves.toMatchSnapshot("Result");
    expect(m.mock).toHaveBeenCalledTimes(1);
    expect(m.and.serviceMock.mock.calls[0]).toMatchSnapshot("Constructor");
  });

  it("Should create reject mock from type", async () => {
    const m = on(SecretsManager).mock("getSecretValue").reject("foo-baz");

    const res = new SecretsManager()
      .getSecretValue({ SecretId: "bar-baz" })
      .promise();

    await expect(res).rejects.toMatchSnapshot("Result");
    expect(m.mock).toHaveBeenCalledTimes(1);
  });

  it("Should create resolve mock from instance", async () => {
    const m = on(new STS())
      .mock("getCallerIdentity")
      .resolve({ Account: "foo", Arn: "arn:foo", UserId: "fooser" });

    const res = m.service.getCallerIdentity().promise();

    await expect(res).resolves.toMatchSnapshot("Result");
    expect(m.mock).toHaveBeenCalledTimes(1);
  });

  it("Should create reject mock from instance", async () => {
    const m = on(new SecretsManager())
      .mock("getSecretValue")
      .reject(Error("baz-BAR"));

    const res = m.service.getSecretValue({ SecretId: "bar-baz" }).promise();

    await expect(res).rejects.toMatchSnapshot("Result");
    expect(m.mock).toHaveBeenCalledTimes(1);
  });

  it("Should not create snapshot", async () => {
    const m = on(SecretsManager)
      .mock("getSecretValue")
      .resolve({ SecretString: "foo-bar" }, { snapshot: false });

    const res = new SecretsManager()
      .getSecretValue({ SecretId: "bar-baz" })
      .promise();

    await expect(res).resolves.toMatchSnapshot("Result");
    expect(m.mock).toHaveBeenCalledTimes(1);
  });

  it("Should invoke result callabck", async () => {
    const m = on(SecretsManager)
      .mock("getSecretValue")
      .resolve(
        () => {
          return {
            SecretString: "FOO",
          };
        },
        { snapshot: false }
      );

    const res = new SecretsManager()
      .getSecretValue({ SecretId: "bar-baz" })
      .promise();

    await expect(res).resolves.toMatchSnapshot("Result");
    expect(m.mock).toHaveBeenCalledTimes(1);
  });

  it("Should chain mocks", async () => {
    const m = on(SecretsManager, { snapshot: false })
      .mock("getSecretValue")
      .resolve(() => {
        return {
          SecretString: "FOO",
        };
      })
      .and.mock("createSecret")
      .resolve({ Name: "FOO_SECRET" });

    const smm = new SecretsManager();

    await expect(
      smm.getSecretValue({ SecretId: "bar-baz" }).promise()
    ).resolves.toMatchSnapshot("getSecretValue");

    await expect(
      smm.createSecret({ Name: "FOO", SecretString: "BAR" }).promise()
    ).resolves.toMatchSnapshot("createSecret");

    expect(m.serviceMock).toHaveBeenCalledTimes(1);
  });

  it("Should chain calls", async () => {
    const m = on(SecretsManager, { snapshot: false })
      .mock("getSecretValue")
      .resolveOnce(() => {
        return {
          SecretString: "FOO",
        };
      })
      .resolveOnce({ SecretString: "FOO_SECRET" })
      .rejectOnce("Third Call");

    const smm = new SecretsManager();

    await expect(
      smm.getSecretValue({ SecretId: "bar-baz" }).promise()
    ).resolves.toMatchSnapshot("getSecretValue 1");

    await expect(
      smm.getSecretValue({ SecretId: "FOO" }).promise()
    ).resolves.toMatchSnapshot("getSecretValue 2");

    await expect(
      smm.getSecretValue({ SecretId: "NONE" }).promise()
    ).rejects.toMatchSnapshot("Rejection Mock");

    expect(
      smm.getSecretValue({ SecretId: "this will return nothing" })
    ).toBeUndefined();

    expect(m.serviceMock).toHaveBeenCalledTimes(1);
    expect(m.mock).toHaveBeenCalledTimes(4);
  });

  it("Should work with DocumentClient", async () => {
    const m = on(DynamoDB.DocumentClient).mock("scan").resolve({ Items: [] });

    await expect(
      new DynamoDB.DocumentClient().scan({ TableName: "foo" }).promise()
    ).resolves.toMatchSnapshot("scan");

    expect(m.serviceMock).toHaveBeenCalledTimes(1);
  });

  it("Should call HttpRequest with options", () => {
    const b = on(SecretsManager);
    b.instance.endpoint = ("https://foo.baz.bar" as unknown) as Endpoint;
    b.instance.config = { region: "foo-bar-1" } as typeof b.instance["config"];
    b.mock("getSecretValue").resolve({ SecretString: "foo-bar" });

    expect(HttpRequest).toHaveBeenCalledWith(
      "https://foo.baz.bar",
      "foo-bar-1"
    );
  });

  it("Should invoke listener", async () => {
    const m = on(SecretsManager)
      .mock("getSecretValue")
      .resolve({ SecretString: "foo-bar" }, { snapshot: false });

    const cb = jest.fn();

    const res = new SecretsManager()
      .getSecretValue({ SecretId: "bar-baz" })
      .on("validate", cb);

    expect(res).toBe(undefined);
    expect(m.mock).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("Should skip if listener not provided", async () => {
    const m = on(SecretsManager)
      .mock("getSecretValue")
      .resolve({ SecretString: "foo-bar" }, { snapshot: false });

    const req = new SecretsManager({ region: "foo" }).getSecretValue({
      SecretId: "bar-baz",
    });

    expect(m.mock).toHaveBeenCalledTimes(1);
    expect(() => req.on("validate", undefined as any)).not.toThrow();
  });
});
