import { Socket } from "node:net";
import { TLSSocket } from "node:tls";
import { Client } from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { verifiedClientTls, verifiedDatabaseConnectionString } from "../../scripts/lib/database-tls";

const sockets: Socket[] = [];
afterEach(() => { for (const socket of sockets.splice(0)) socket.destroy(); });

describe("verified client transport", () => {
  it("requires an encrypted TLS socket with an authorized certificate", () => {
    const socket = new TLSSocket(new Socket());
    sockets.push(socket);
    expect(verifiedClientTls(socket)).toBe(false);
    socket.authorized = true;
    expect(verifiedClientTls(socket)).toBe(true);
    Object.defineProperty(socket, "encrypted", { value: false });
    expect(verifiedClientTls(socket)).toBe(false);
  });

  it.each([undefined, null, {}, { encrypted: true, authorized: true }, { encrypted: "true", authorized: "true" }])(
    "rejects missing or simulated socket evidence (%j)", value => {
      expect(verifiedClientTls(value)).toBe(false);
    }
  );

  it("rejects a plain TCP socket", () => {
    const socket = new Socket();
    sockets.push(socket);
    expect(verifiedClientTls(socket)).toBe(false);
  });
});

const connection = (query: string, scheme = "postgresql") => [
  scheme, "://", "runtime", ":", "synthetic%2Fcredential", "@", "pool.example.invalid:5432", "/tablesync", query
].join("");

describe("verification connection settings", () => {
  it.each(["require", "verify-ca", "verify-full"])("enforces certificate and hostname checks for %s", mode => {
    const original = new URL(connection(`?sslmode=${mode}&channel_binding=require&application_name=probe`));
    const verified = new URL(verifiedDatabaseConnectionString(original.toString()));
    expect(verified.searchParams.get("sslmode")).toBe("verify-full");
    expect(verified.searchParams.get("channel_binding")).toBe("require");
    expect(verified.searchParams.get("application_name")).toBe("probe");
    for (const key of ["protocol", "hostname", "port", "username", "password", "pathname"] as const) {
      expect(verified[key]).toBe(original[key]);
    }
  });

  it("replaces conflicting duplicate modes even with libpq compatibility enabled", () => {
    const verified = new URL(verifiedDatabaseConnectionString(connection(
      "?sslmode=require&sslmode=no-verify&uselibpqcompat=true"
    )));
    expect(verified.searchParams.getAll("sslmode")).toEqual(["verify-full"]);
    expect(verified.searchParams.get("uselibpqcompat")).toBe("true");
    // Constructing pg's client parses its SSL options without connecting.
    const client = new Client({ connectionString: verified.toString() });
    sockets.push(client.connection.stream as Socket);
    expect(client.ssl).not.toBe(false);
    expect(client.ssl).not.toMatchObject({ rejectUnauthorized: false });
    expect(client.ssl).not.toHaveProperty("checkServerIdentity");
  });

  it.each(["", "?sslmode=disable", "?sslmode=no-verify"])("rejects a source without required TLS (%s)", query => {
    expect(() => verifiedDatabaseConnectionString(connection(query))).toThrow();
  });

  it("rejects another protocol", () => {
    expect(() => verifiedDatabaseConnectionString(connection("?sslmode=require", "https"))).toThrow();
  });
});
