import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TextInput, Pressable } from 'react-native';
import { Appbar, Button, Chip, Divider, FAB, Menu, Text, Snackbar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { getValidChipColors } from '@/lib/colors';

// Добавляем интерфейс Status (если он не уже импортирован/определен)
interface Status { 
  id: number;
  name: string;
  color: string;
}

// Добавляем интерфейсы Service и Packaging
interface Service {
  id: number;
  name: string;
}

interface Packaging {
  id: number;
  name: string;
}

export default function DeliveryScreen() {
  const [filterTimeVisible, setFilterTimeVisible] = useState(false);
  const [filterDistanceVisible, setFilterDistanceVisible] = useState(false);
  const [filterTime, setFilterTime] = useState('Все время пути');
  const [filterDistance, setFilterDistance] = useState('Все дистанции');
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(true);
  const router = useRouter();
  const [statusesRef, setStatusesRef] = useState<Status[]>([]);
  const [servicesRef, setServicesRef] = useState<Service[]>([]);
  const [packagingsRef, setPackagingsRef] = useState<Packaging[]>([]);

  const fetchDeliveries = useCallback(async () => {
    console.log("fetchDeliveries called");
    setLoading(true);
    setError(null);
    try {
      console.log("Calling api.getDeliveries");
      const data = await api.getDeliveries(logout);
      setDeliveries(data.results || data);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки');
      console.error("Error fetching deliveries:", e);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Загружаем данные при первом монтировании компонента
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Fetching initial deliveries and references...");
        // Загружаем доставки и все ссылки одновременно
        const [deliveriesData, statusesData, servicesData, packagingsData] = await Promise.all([
            api.getDeliveries(logout),
            api.getStatuses(logout),
            api.getServices(logout), // Загружаем услуги
            api.getPackagings(logout) // Загружаем упаковки
        ]);
        
        setDeliveries(deliveriesData.results || deliveriesData);
        setStatusesRef(statusesData?.results || statusesData || []);
        setServicesRef(servicesData?.results || servicesData || []); // Сохраняем ссылку на услуги
        setPackagingsRef(packagingsData?.results || packagingsData || []); // Сохраняем ссылку на упаковки
        console.log("Initial data loaded.");

      } catch (e: any) {
        setError(e.message || 'Ошибка начальной загрузки');
        console.error("Error fetching initial data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [logout]);

  // Также, перезагружаем только доставки при переходе на экран
  useFocusEffect(
    useCallback(() => {
      fetchDeliveries(); // Всегда загружаем данные при переходе на экран
    }, [fetchDeliveries])
  );

  function getDurationMinutes(item: any) {
    const diffMs = new Date(item.delivery_time).getTime() - new Date(item.departure_time).getTime();
    return Math.floor(diffMs / 60000);
  }

  const filteredDeliveries = deliveries
    .filter(item => {
      const duration = getDurationMinutes(item);
      if (filterTime === 'До 1 часа') return duration <= 60;
      if (filterTime === 'До 2 часов') return duration <= 120;
      return true;
    })
    .filter(item => {
      if (filterDistance === 'До 5 км') return item.distance <= 5;
      if (filterDistance === 'До 10 км') return item.distance <= 10;
      return true;
    })
    .filter(item => {
      if (!searchText) return true;
      return item.id?.toString().includes(searchText);
    })
    .sort((a, b) => getDurationMinutes(a) - getDurationMinutes(b));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
        <Appbar.Content title="Доставка" titleStyle={{ fontSize: 26, fontWeight: 'bold' }} />
        <Appbar.Action icon="filter-variant" onPress={() => setFiltersVisible(v => !v)} />
        <Appbar.Action icon="magnify" onPress={() => setSearchVisible(v => !v)} />
      </Appbar.Header>
      {searchVisible && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <TextInput
            placeholder="Введите номер доставки только цифры"
            placeholderTextColor="#888"
            value={searchText}
            onChangeText={setSearchText}
            keyboardType="numeric"
            style={{
              backgroundColor: '#232428',
              color: '#fff',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#444',
              paddingHorizontal: 12,
              height: 40,
            }}
            autoFocus
          />
        </View>
      )}
      {filtersVisible && (
        <View style={styles.filtersRow}>
          <Menu
            visible={filterTimeVisible}
            onDismiss={() => setFilterTimeVisible(false)}
            anchor={
              <Button
                mode="outlined"
                icon={() => <MaterialIcons name="access-time" size={18} color="#fff" />}
                onPress={() => setFilterTimeVisible(true)}
                style={styles.filterBtn}
                textColor="#fff"
              >
                {filterTime}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setFilterTime('Все время пути'); setFilterTimeVisible(false); }} title="Все время пути" />
            <Menu.Item onPress={() => { setFilterTime('До 1 часа'); setFilterTimeVisible(false); }} title="До 1 часа" />
            <Menu.Item onPress={() => { setFilterTime('До 2 часов'); setFilterTimeVisible(false); }} title="До 2 часов" />
          </Menu>
          <Menu
            visible={filterDistanceVisible}
            onDismiss={() => setFilterDistanceVisible(false)}
            anchor={
              <Button
                mode="outlined"
                icon={() => <MaterialIcons name="local-shipping" size={18} color="#fff" />}
                onPress={() => setFilterDistanceVisible(true)}
                style={styles.filterBtn}
                textColor="#fff"
              >
                {filterDistance}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setFilterDistance('Все дистанции'); setFilterDistanceVisible(false); }} title="Все дистанции" />
            <Menu.Item onPress={() => { setFilterDistance('До 5 км'); setFilterDistanceVisible(false); }} title="До 5 км" />
            <Menu.Item onPress={() => { setFilterDistance('До 10 км'); setFilterDistanceVisible(false); }} title="До 10 км" />
          </Menu>
        </View>
      )}
      {loading ? (
        <ActivityIndicator size="large" color="#176c3a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item, index) => item.id?.toString() || `item-${index}`}
          ItemSeparatorComponent={() => (
            <Divider style={{ marginVertical: 4, backgroundColor: '#333' }} />
          )}
          renderItem={({ item }: { item: any }) => {
            const statusObject = statusesRef.find(s => s.id === item.status);
            const { backgroundColor: statusBg, textColor: statusText } = getValidChipColors(
              statusObject?.color,
              styles.statusChip.backgroundColor,
              styles.statusChipText.color
            );

            return (
              <Pressable
                style={styles.card}
                onPress={() => {
                  router.push(`/delivery-detail?id=${item.id}` as any);
                }}
              >
                <View style={styles.listItemContent}>
                  <View style={styles.mainContent}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{`№${item.id}`}</Text>
                    <View>
                      <View style={styles.row}>
                        <MaterialIcons name="access-time" size={16} color="#bbb" style={styles.icon} />
                        <Text style={styles.descText}>
                          {(() => {
                            const diffMs = new Date(item.delivery_time).getTime() - new Date(item.departure_time).getTime();
                            const diffMinutes = Math.floor(diffMs / 60000);
                            const hours = Math.floor(diffMinutes / 60);
                            const minutes = diffMinutes % 60;
                            const durationStr = hours > 0 ? `${hours} ч ` : '';
                            const minutesStr = minutes > 0 ? `${minutes} мин` : '';
                            return (durationStr + minutesStr).trim() || '0 мин';
                          })()}
                        </Text>
                        <MaterialIcons name="local-shipping" size={16} color="#bbb" style={styles.icon} />
                        <Text style={styles.descText}>{item.distance} км</Text>
                        <MaterialIcons name="info" size={16} color="#bbb" style={styles.icon} />
                        <Text style={[styles.descText, {flexShrink: 1}]} numberOfLines={1} ellipsizeMode='tail'>
                          {item.services?.map((id: number) => servicesRef.find(s => s.id === id)?.name || `ID:${id}`).join(', ') || '-'}
                        </Text>
                      </View>

                      <View style={styles.row}>
                        <MaterialIcons name="inventory" size={16} color="#bbb" style={styles.icon} />
                        <Text style={[styles.descText, {flexShrink: 1}]} numberOfLines={1} ellipsizeMode='tail'>{packagingsRef.find(p => p.id === item.packaging)?.name || '-'}</Text>
                      </View>

                      <View style={styles.row}>
                        <Chip
                          style={[styles.statusChip, { backgroundColor: statusBg }]}
                          textStyle={[styles.statusChipText, { color: statusText }]}
                        >
                          {statusObject?.name || 'Неизвестно'}
                        </Chip>
                        <Chip
                          style={[
                            styles.chip,
                            {
                              backgroundColor: item.technical_state
                                ? '#176c3a'
                                : '#ff0000',
                            },
                          ]}
                          textStyle={styles.chipText}
                        >
                          {item.technical_state ? 'Исправно' : 'Неисправно'}
                        </Chip>
                      </View>
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color="#bbb"
                    style={{ alignSelf: 'center' }}
                  />
                </View>
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/create-delivery')}
        color="#176c3a"
      />
      <Snackbar
        visible={!!error}
        onDismiss={() => setError(null)}
        duration={3000}
        style={{ backgroundColor: 'red' }}
      >
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#232428',
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterBtn: {
    borderRadius: 8,
    borderColor: '#444',
    borderWidth: 1,
    backgroundColor: '#232428',
    marginRight: 8,
  },
  card: {
    backgroundColor: '#232428',
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
    gap: 6,
  },
  descText: {
    color: '#bbb',
    fontSize: 14,
    marginRight: 8,
  },
  chip: {
    marginRight: 8,
    height: 28,
    justifyContent: 'center',
    backgroundColor: '#176c3a',
  },
  chipText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#e3eaff',
    borderRadius: 32,
    elevation: 4,
  },
  icon: {
    marginRight: 4,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mainContent: {
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    marginRight: 8,
    height: 28,
    justifyContent: 'center',
    backgroundColor: '#176c3a',
  },
  statusChipText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
}); 