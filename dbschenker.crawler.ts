import puppeteer from "puppeteer";

export interface ScrapeData {
    normalized: {
        arrivalPort: string,
        arrivalDate: string,
        vesselName: string
    },
    raw: any,
    error?: any
}

export default class DBSchenkerCrawler {

    async exec(container: string, mbl: string): Promise<ScrapeData> {
        const scrapeData = await this.scrapeData(mbl);

        if (scrapeData.error) {
            throw scrapeData.error;
        }

        this.checkForContainer(container, scrapeData);
        return scrapeData;
    }

    async scrapeData(mbl: string): Promise<ScrapeData> {
        // This variable is initialized outside the try/catch block so we can close the browser regardless of the outcome of the method
        let browser;

        // This will be our output data
        const outputObj: ScrapeData = {
            normalized: {
                arrivalPort: '',
                arrivalDate: '',
                vesselName: ''
            },
            raw: {}
        };

        try {
            // Puppeteer was preferred over Axios because there are cookies, tokens or other counter-measures that prevent requesting the content directly
            browser = await puppeteer.launch({ headless: 'new' }); // Change the 'headless' parameter to false to show the browser when debugging
            const page = await browser.newPage();

            // Intercept the json with the shipment data to use as raw content
            page.on('response', async response => {
                if (/nges-portal\/api\/public\/tracking-public\/shipments\/ocean\/\d+$/.test(response.url()) && await response.text()) {
                    outputObj.raw = await response.json();
                }
            });

            // The default screen size presented some issues with the click event to open the panels
            await page.setViewport({ width: 1080, height: 1024 });

            // Navigate to the page and wait until all the requests are fulfilled
            await page.goto(`https://www.dbschenker.com/app/tracking-public/?refNumber=${mbl}`, { timeout: 60000, waitUntil: 'networkidle0' });

            /* At this point we should already have retrieved all the shipment info in json format and could parse the data from there,
            ** but since we already have Pupetteer running let's get it from the page to showcase some more uses of this library
            */

            // Remove the cookie agreement wall
            await page.evaluate(`document.querySelector('es-shell').shadowRoot.querySelector('shell-footer').remove();`);

            // Check for error message on page
            await page.waitForNetworkIdle();
            const error = await page.$('.error');
            if(error !== null) {
                const errorText = (await error?.evaluate(el => el.textContent)) || '';
                throw new Error(errorText);
            }

            // Open the vessels pane to load the vessel info into the DOM
            await page.waitForSelector('[data-test="vessels_label"]');
            await page.click('[data-test="vessels_label"]');

            // select the desired data from the page
            const arrivalPort = await page.waitForSelector('[data-test="consignee_place_value"]');
            const arrivalDate = await page.waitForSelector('[data-test="deliver_to_value"]');
            const vesselName = await page.waitForSelector('[data-test="vessels_name_0_value"]');

            // And save it on our output objsect
            outputObj.normalized = {
                arrivalPort: (await arrivalPort?.evaluate(el => el.textContent))?.trim() || '',
                arrivalDate: (await arrivalDate?.evaluate(el => el.textContent))?.trim() || '',
                vesselName: (await vesselName?.evaluate(el => el.textContent))?.trim() || ''
            };
        } catch (e) {
            outputObj.error = e;
            console.error('[DBSchenkerCrawler.scrapeData]', e);
        }

        await browser?.close();
        return outputObj;
    }

    checkForContainer(container: string, scrapeData: ScrapeData): void {
        if (!scrapeData.raw.containerNumbers?.length) {
            throw new Error("The provided Bill of Ladens has no container registered");
        }

        const cleanContainerNumbers = scrapeData.raw.containerNumbers.map(this.clearString);

        if (!cleanContainerNumbers.includes(this.clearString(container))) {
            throw new Error("Container not found in the provided Bill of Ladens");
        }
    }

    clearString(text: string): string {
        return text.replace(/[^\d\w]/gi, '');
    }

}
