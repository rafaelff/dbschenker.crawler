import DBSchenkerCrawler from "../dbschenker.crawler";
import testData from "./test-data.json";

describe('DBSchenkerCrawler', () => {
    const crawler = new DBSchenkerCrawler();
    jest.setTimeout(60000);

    test.each(testData)('Success case %#', async (mbl: string, container: string) => {
        const result = await crawler.exec(container, mbl);

        expect(result.normalized.arrivalDate).toBeTruthy();
        expect(result.normalized.arrivalPort).toBeTruthy();
        expect(result.normalized.vesselName).toBeTruthy();
    });

    test('Should fail with container not found', async () => {
        const request = crawler.exec('notAContainerId', testData[0][0]);
        await expect(request).rejects.toEqual(new Error('Container not found in the provided Bill of Ladens'));
    });

    test('Should fail with shipment not found', async () => {
        const request = crawler.exec('notAContainerId', 'TWTPE0000355702');
        await expect(request).rejects.toEqual(new Error('Shipment not found!'));
    });
});
