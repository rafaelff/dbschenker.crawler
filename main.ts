#!/usr/bin/env node

import { Command } from 'commander';
import nodePackage from './package.json';
import DBSchenkerCrawler from "./dbschenker.crawler";

const program = new Command();

program
  .name('DBSchenker Crawler')
  .description('CLI to search DBSchenker for a shipment data')
  .version(nodePackage.version);

program
    .command('search')
    .description('Search for shipment data given a container identifier and a Bill of Ladens identifier')
    .argument('<container>', 'container identifier')
    .argument('<mbl>', 'master bill of ladens identifier')
    .action(async (container: string, mbl: string) => {
        const crawler = new DBSchenkerCrawler();
        try {
          const result = await crawler.exec(container, mbl);
          console.log(result);
        } catch (e: any) {
          console.log('');
          console.log('Couldn\'t find data with given paramenters:', e.message);
        }
    });

program.parse(process.argv);
