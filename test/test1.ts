import { driver, startDriver, stopDriver } from "./setup.ts";
import { expect } from "chai";
import { By } from "selenium-webdriver";
import { before, after, describe, it } from "mocha";

before(async function () {
  this.timeout(60 * 1000);
  await startDriver();
});

after(async () => {
  await stopDriver();
});

describe("Example test", () => {
  it("should see Hello", async () => {
    const text = await driver.findElement(By.css("body > h1")).getText();
    expect(text).to.match(/Hello/);
  });
});
