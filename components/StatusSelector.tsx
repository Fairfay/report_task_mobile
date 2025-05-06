import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Menu, Text, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { getValidChipColors } from '@/lib/colors';
import { black } from 'react-native-paper/lib/typescript/styles/themes/v2/colors';
// Компонент выпадающего списка для выбора статуса
interface Status {
  id: number;
  name: string;
  color?: string;
}

interface StatusSelectorProps {
  statuses: Status[];
  selectedStatusId: number | null;
  onSelectStatus: (statusId: number) => void;
  label?: string;
  disabled?: boolean;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  statuses,
  selectedStatusId,
  onSelectStatus,
  label = 'Статус',
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);// Состояние открытия меню

  const openMenu = () => !disabled && setVisible(true);
  const closeMenu = () => setVisible(false);

  const selectedStatus = statuses.find(s => s.id === selectedStatusId);
  const { backgroundColor: selectedBg} = getValidChipColors(selectedStatus?.color, '#232428');

  return (
    <View>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={
          // Кнопка с текущим выбором
          <Button
            mode="outlined"
            onPress={openMenu}
            icon={props => <MaterialIcons name="arrow-drop-down" {...props} />}
            style={{ marginTop: 8, borderColor: '#444', backgroundColor: selectedBg}}
            textColor={black}
            contentStyle={{ justifyContent: 'space-between' }}
            disabled={disabled}
          >
            <Text style={{ color: black }}>
            {selectedStatus ? `${label}: ${selectedStatus.name}` : `${label}: Не выбран`}
            </Text>
          </Button>
        }
        contentStyle={{ backgroundColor: '#333' }}
      >
        {/* Список статусов */}
        {statuses.map((statusItem) => {
          const { backgroundColor: itemBg} = getValidChipColors(statusItem.color, '#333');
          return (
            <Menu.Item
              key={statusItem.id}
              onPress={() => {
                onSelectStatus(statusItem.id);
                closeMenu();
              }}
              title={statusItem.name}
              style={{ backgroundColor: itemBg, color: black}}
              titleStyle={{ color: black}} 
            />
          );
        })}
        {statuses.length === 0 && (
            <Menu.Item title="Нет доступных статусов" disabled />
        )}
      </Menu>
    </View>
  );
}; 