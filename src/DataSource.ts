import { DataSourceInstanceSettings, MetricFindValue, DataQueryRequest, DataFrame, DataFrameView, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { GithubDataSourceOptions, Label, GitHubQuery, GitHubVariableQuery } from './types';
import { ReplaceVariables } from './variables';
import { isValid } from './validation';

export class DataSource extends DataSourceWithBackend<GitHubQuery, GithubDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<GithubDataSourceOptions>) {
    super(instanceSettings);
  }

  templateSrv = getTemplateSrv();

  applyTemplateVariables(query: GitHubQuery, _: ScopedVars): Record<string, any> {
    return ReplaceVariables(this.templateSrv, query);
  }

  async getLabels(repository: string, owner: string, query?: string): Promise<Label[]> {
    return this.getResource('labels', {
      repository,
      owner,
      query,
    });
  }

  async getChoices(query: GitHubQuery): Promise<string[]> {
    const request = {
      targets: [{
        ...query,
        refId: 'metricFindQuery',
      }],
      range: {
        to: {},
        from: {},
      },
    } as DataQueryRequest;

    const res = await this.query(request).toPromise().catch(err => { throw err; });
    const columns = res.data[0]?.fields.map((f: any) => f.name) || [];
    return columns;
  }

  async metricFindQuery(query: GitHubVariableQuery, options: any): Promise<MetricFindValue[]> {
    if(!isValid(query)) return [];

    const request = {
      targets: [{
        ...query,
        refId: 'metricFindQuery',
      }],
      range: options.range,
      rangeRaw: options.rangeRaw,
    } as DataQueryRequest;

    const res = await this.query(request).toPromise().catch(err => { throw err; });
    if(!res || !res.data || res.data.length < 0) {
      return []
    }

    const view = new DataFrameView(res.data[0] as DataFrame);
    return view.map(item => {
      return {
        text: item[query.field || 'name'],
      }
    });
  }
}
