import type { CataloguePage, CatalogueProvider, CatalogueSearchOptions, CatalogueTitle, MediaKind } from "./types";

/**
 * The UI depends on this provider contract, not on a specific metadata vendor.
 * Add a concrete adapter only after its API terms, credentials, and response
 * contract have been reviewed. Never place provider secrets in browser code.
 */
export class UnconfiguredCatalogueProvider implements CatalogueProvider {
  readonly name = "unconfigured";
  async search(_options: CatalogueSearchOptions): Promise<CataloguePage> {
    throw new Error("A licensed catalogue metadata provider has not been configured.");
  }
  async getTitle(_id: string, _kind: MediaKind): Promise<CatalogueTitle | null> {
    throw new Error("A licensed catalogue metadata provider has not been configured.");
  }
}