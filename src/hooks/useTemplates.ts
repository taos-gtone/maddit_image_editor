import { useState, useCallback, useEffect } from 'react';
import type { SizeTemplate } from '../types';

export function useTemplates() {
  const [templates, setTemplates] = useState<SizeTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SizeTemplate | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const result = await window.electronAPI.getTemplates();
      setTemplates(result);
    } catch {
      // Use empty if load fails
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const openAddModal = useCallback(() => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((template: SizeTemplate) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  }, []);

  const addTemplate = useCallback(async (name: string, width: number, height: number) => {
    await window.electronAPI.addTemplate(name, width, height);
    await loadTemplates();
    closeModal();
  }, [loadTemplates, closeModal]);

  const updateTemplate = useCallback(async (id: string, name: string, width: number, height: number) => {
    await window.electronAPI.updateTemplate(id, name, width, height);
    await loadTemplates();
    closeModal();
  }, [loadTemplates, closeModal]);

  const deleteTemplate = useCallback(async (id: string) => {
    await window.electronAPI.deleteTemplate(id);
    await loadTemplates();
  }, [loadTemplates]);

  const restoreBuiltIns = useCallback(async () => {
    await window.electronAPI.restoreBuiltInTemplates();
    await loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    isModalOpen,
    editingTemplate,
    openAddModal,
    openEditModal,
    closeModal,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    restoreBuiltIns,
  };
}
