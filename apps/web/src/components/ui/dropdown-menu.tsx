import * as React from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DropdownMenu = Dropdown.Root;
export const DropdownMenuTrigger = Dropdown.Trigger;
export const DropdownMenuGroup = Dropdown.Group;
export const DropdownMenuPortal = Dropdown.Portal;
export const DropdownMenuSub = Dropdown.Sub;
export const DropdownMenuRadioGroup = Dropdown.RadioGroup;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof Dropdown.Content>,
  React.ComponentPropsWithoutRef<typeof Dropdown.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <Dropdown.Portal>
    <Dropdown.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  </Dropdown.Portal>
));
DropdownMenuContent.displayName = Dropdown.Content.displayName;

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof Dropdown.Item>,
  React.ComponentPropsWithoutRef<typeof Dropdown.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <Dropdown.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
      'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = Dropdown.Item.displayName;

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof Dropdown.Label>,
  React.ComponentPropsWithoutRef<typeof Dropdown.Label>
>(({ className, ...props }, ref) => (
  <Dropdown.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = Dropdown.Label.displayName;

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof Dropdown.Separator>,
  React.ComponentPropsWithoutRef<typeof Dropdown.Separator>
>(({ className, ...props }, ref) => (
  <Dropdown.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = Dropdown.Separator.displayName;

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof Dropdown.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof Dropdown.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <Dropdown.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Dropdown.ItemIndicator>
        <Check className="h-4 w-4" />
      </Dropdown.ItemIndicator>
    </span>
    {children}
  </Dropdown.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = Dropdown.CheckboxItem.displayName;
