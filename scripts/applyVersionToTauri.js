import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const projectRootDir = [import.meta.dirname, `..`];
const tauriConfPath = join(...projectRootDir, `src-tauri`, `tauri.conf.json`);
const cargoTomlPath = join(...projectRootDir, `src-tauri`, `Cargo.toml`);
const cargoLockPath = join(...projectRootDir, `src-tauri`, `Cargo.lock`);
const packageJsonPath = join(...projectRootDir, `package.json`);

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

writeFileSync(tauriConfPath, JSON.stringify({ ...JSON.parse(readFileSync(tauriConfPath, 'utf-8')), version }, null, 2));
writeFileSync(cargoTomlPath, readFileSync(cargoTomlPath, 'utf-8').replace(/version = ".*?"/, `version = "${version}"`));
writeFileSync(cargoLockPath, readFileSync(cargoLockPath, 'utf-8').replace(/(\[\[package\]\]\r?\nname = "black-book-browser"\r?\n)version = ".*?"/, `$1version = "${version}"`));