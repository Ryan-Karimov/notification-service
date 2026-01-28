import { templateRepository } from '../../db/repositories/index.js';
import { extractVariables, renderTemplate, validateTemplate } from '../../templates/engine.js';
import { NotFoundError, ConflictError, ValidationError } from '../../middleware/error-handler.middleware.js';
import type { Template, NotificationChannel } from '../../types/database.js';
import type { CreateTemplateInput, UpdateTemplateInput, TemplateQuery } from './template.schema.js';

export const templateService = {
  async create(apiKeyId: string, input: CreateTemplateInput): Promise<Template> {
    const existing = await templateRepository.findByCode(apiKeyId, input.code);
    if (existing) {
      throw new ConflictError(`Template with code "${input.code}" already exists`);
    }

    const bodyValidation = validateTemplate(input.body);
    if (!bodyValidation.valid) {
      throw new ValidationError(`Invalid body template: ${bodyValidation.error}`);
    }

    if (input.subject) {
      const subjectValidation = validateTemplate(input.subject);
      if (!subjectValidation.valid) {
        throw new ValidationError(`Invalid subject template: ${subjectValidation.error}`);
      }
    }

    if (input.channel === 'email' && !input.subject) {
      throw new ValidationError('Subject is required for email templates');
    }

    const bodyVariables = extractVariables(input.body);
    const subjectVariables = input.subject ? extractVariables(input.subject) : [];
    const variables = [...new Set([...bodyVariables, ...subjectVariables])];

    return templateRepository.create({
      api_key_id: apiKeyId,
      code: input.code,
      name: input.name,
      channel: input.channel,
      subject: input.subject ?? null,
      body: input.body,
      variables,
    });
  },

  async findById(id: string, apiKeyId: string): Promise<Template> {
    const template = await templateRepository.findById(id);
    if (!template || template.api_key_id !== apiKeyId) {
      throw new NotFoundError('Template not found');
    }
    return template;
  },

  async findByCode(apiKeyId: string, code: string): Promise<Template> {
    const template = await templateRepository.findByCode(apiKeyId, code);
    if (!template) {
      throw new NotFoundError(`Template with code "${code}" not found`);
    }
    return template;
  },

  async findAll(apiKeyId: string, query: TemplateQuery) {
    return templateRepository.findAll(
      {
        apiKeyId,
        channel: query.channel as NotificationChannel | undefined,
        search: query.search,
      },
      {
        limit: query.limit,
        offset: query.offset,
      }
    );
  },

  async update(id: string, apiKeyId: string, input: UpdateTemplateInput): Promise<Template> {
    const template = await this.findById(id, apiKeyId);

    if (input.body) {
      const bodyValidation = validateTemplate(input.body);
      if (!bodyValidation.valid) {
        throw new ValidationError(`Invalid body template: ${bodyValidation.error}`);
      }
    }

    if (input.subject) {
      const subjectValidation = validateTemplate(input.subject);
      if (!subjectValidation.valid) {
        throw new ValidationError(`Invalid subject template: ${subjectValidation.error}`);
      }
    }

    const newBody = input.body ?? template.body;
    const newSubject = input.subject === null ? null : (input.subject ?? template.subject);

    const bodyVariables = extractVariables(newBody);
    const subjectVariables = newSubject ? extractVariables(newSubject) : [];
    const variables = [...new Set([...bodyVariables, ...subjectVariables])];

    const updated = await templateRepository.update(id, {
      name: input.name,
      subject: newSubject,
      body: input.body,
      variables,
    });

    if (!updated) {
      throw new NotFoundError('Template not found');
    }

    return updated;
  },

  async delete(id: string, apiKeyId: string): Promise<void> {
    await this.findById(id, apiKeyId);
    const deleted = await templateRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Template not found');
    }
  },

  async preview(
    id: string,
    apiKeyId: string,
    variables: Record<string, unknown>
  ): Promise<{ subject?: string; body: string }> {
    const template = await this.findById(id, apiKeyId);
    return renderTemplate(template.subject, template.body, variables);
  },
};
