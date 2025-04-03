import React from 'react';
import * as CommandUI from './ui/command';

// This component just re-exports the Command components with proper typing
export const Command = CommandUI.Command;
export const CommandDialog = CommandUI.CommandDialog as React.FC<React.PropsWithChildren<any>>;
export const CommandInput = CommandUI.CommandInput;
export const CommandList = CommandUI.CommandList;
export const CommandEmpty = CommandUI.CommandEmpty;
export const CommandGroup = CommandUI.CommandGroup;
export const CommandItem = CommandUI.CommandItem;
export const CommandShortcut = CommandUI.CommandShortcut;
export const CommandSeparator = CommandUI.CommandSeparator; 