/* eslint-disable @nx/enforce-module-boundaries */
// nx-ignore-next-line
import type { ProjectGraphProjectNode } from '@nx/devkit';

import { TargetConfigurationDetailsListItem } from '../target-configuration-details-list-item/target-configuration-details-list-item';
import { TargetConfigurationGroupContainer } from '../target-configuration-details-group-container/target-configuration-details-group-container';
import { groupTargets } from '../utils/group-targets';
import { useMemo } from 'react';

export interface TargetConfigurationGroupListProps {
  project: ProjectGraphProjectNode;
  sourceMap: Record<string, string[]>;
  variant?: 'default' | 'compact';
  onRunTarget?: (data: { projectName: string; targetName: string }) => void;
  onViewInTaskGraph?: (data: {
    projectName: string;
    targetName: string;
  }) => void;
  className?: string;
}

export function TargetConfigurationGroupList({
  project,
  variant,
  sourceMap,
  onRunTarget,
  onViewInTaskGraph,
  className = '',
}: TargetConfigurationGroupListProps) {
  const targetsGroup = useMemo(() => groupTargets(project), [project]);
  const hasGroups = useMemo(() => {
    for (const group of Object.entries(targetsGroup.groups)) {
      if (group[1]?.length > 0) return true;
    }
    return false;
  }, [targetsGroup]);

  if (!hasGroups) {
    // If there are no target groups, then don't show nested groups
    return (
      <ul className={`mt-8 ${className}`}>
        {targetsGroup.targets.map((targetName) => {
          return (
            <TargetConfigurationDetailsListItem
              project={project}
              sourceMap={sourceMap}
              variant={variant}
              onRunTarget={onRunTarget}
              onViewInTaskGraph={onViewInTaskGraph}
              targetName={targetName}
              collapsable={true}
              key={targetName}
            />
          );
        })}
      </ul>
    );
  } else {
    // Otherwise, show all the groups first, and the ungrouped targets are under "Others"
    return (
      <>
        {Object.entries(targetsGroup.groups).map(
          ([targetGroupName, targets]) => {
            return (
              <TargetConfigurationGroupContainer
                targetGroupName={targetGroupName}
                targetsNumber={targets.length}
                key={targetGroupName}
              >
                <ul className={className}>
                  {targets.map((targetName) => (
                    <TargetConfigurationDetailsListItem
                      project={project}
                      sourceMap={sourceMap}
                      variant={variant}
                      onRunTarget={onRunTarget}
                      onViewInTaskGraph={onViewInTaskGraph}
                      targetName={targetName}
                      collapsable={true}
                      key={targetName}
                    />
                  ))}
                </ul>
              </TargetConfigurationGroupContainer>
            );
          }
        )}
        <TargetConfigurationGroupContainer
          targetGroupName="Others"
          targetsNumber={targetsGroup.targets.length}
          key="other"
        >
          <ul className={`p-2 ${className}`}>
            {targetsGroup.targets.map((targetName) => {
              return (
                <TargetConfigurationDetailsListItem
                  project={project}
                  sourceMap={sourceMap}
                  variant={variant}
                  onRunTarget={onRunTarget}
                  onViewInTaskGraph={onViewInTaskGraph}
                  targetName={targetName}
                  collapsable={true}
                  key={targetName}
                />
              );
            })}
          </ul>
        </TargetConfigurationGroupContainer>
      </>
    );
  }
}
