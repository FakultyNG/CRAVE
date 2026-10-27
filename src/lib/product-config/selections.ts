type OptionRule = { name: string; groupName: string; isRequired: boolean; maxSelections: number };

export function optionSelectionError(options: OptionRule[], selectedNames: string[]) {
  const groups = new Map<string, OptionRule[]>();
  for (const option of options) groups.set(option.groupName, [...(groups.get(option.groupName) ?? []), option]);
  for (const [groupName, groupOptions] of groups) {
    const selectedCount = groupOptions.filter((option) => selectedNames.includes(option.name)).length;
    if (groupOptions[0].isRequired && selectedCount === 0) return `Choose an option for ${groupName}.`;
    if (selectedCount > groupOptions[0].maxSelections) return `Choose no more than ${groupOptions[0].maxSelections} for ${groupName}.`;
  }
  return null;
}
